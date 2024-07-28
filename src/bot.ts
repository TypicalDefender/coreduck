import './fetch-polyfill';

import { info, setFailed, warning } from '@actions/core';
import {
    ChatGPTAPI,
    ChatGPTError,
    ChatMessage,
    SendMessageOptions,
    // eslint-disable-next-line import/no-unresolved
} from 'chatgpt';
import pRetry from 'p-retry';
import { OpenAIOptions, Options } from './options';

// define type to save parentMessageId and conversationId
export interface Ids {
    parentMessageId?: string;
    conversationId?: string;
}

export class Bot {
    private readonly api: ChatGPTAPI | null = null; // not free
    private readonly options: Options;

    constructor(options: Options, openaiOptions: OpenAIOptions) {
        this.options = options;
        this.api = this.initializeAPI(options, openaiOptions);
    }

    private initializeAPI(options: Options, openaiOptions: OpenAIOptions): ChatGPTAPI | null {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error(
                "Unable to initialize the OpenAI API, 'OPENAI_API_KEY' environment variable is not available"
            );
        }

        const systemMessage = this.constructSystemMessage(options, openaiOptions);
        return new ChatGPTAPI({
            apiBaseUrl: options.apiBaseUrl,
            systemMessage,
            apiKey: process.env.OPENAI_API_KEY,
            apiOrg: process.env.OPENAI_API_ORG ?? undefined,
            debug: options.debug,
            maxModelTokens: openaiOptions.tokenLimits.maxTokens,
            maxResponseTokens: openaiOptions.tokenLimits.responseTokens,
            completionParams: {
                temperature: options.openaiModelTemperature,
                model: openaiOptions.model,
            },
        });
    }

    private constructSystemMessage(options: Options, openaiOptions: OpenAIOptions): string {
        const currentDate = new Date().toISOString().split('T')[0];
        return `${options.systemMessage} 
Knowledge cutoff: ${openaiOptions.tokenLimits.knowledgeCutOff}
Current date: ${currentDate}

IMPORTANT: Entire response must be in the language with ISO code: ${options.language}
`;
    }

    chat = async (message: string, ids: Ids): Promise<[string, Ids]> => {
        try {
            return await this.chat_(message, ids);
        } catch (e: unknown) {
            if (e instanceof ChatGPTError) {
                warning(`Failed to chat: ${e}, backtrace: ${e.stack}`);
            }
            return ['', {}];
        }
    };

    private readonly chat_ = async (message: string, ids: Ids): Promise<[string, Ids]> => {
        if (!message) {
            return ['', {}];
        }

        const start = Date.now();
        const response = await this.sendMessageWithRetry(message, ids);
        const end = Date.now();

        info(`response: ${JSON.stringify(response)}`);
        info(`openai sendMessage (including retries) response time: ${end - start} ms`);

        const responseText = this.extractResponseText(response);
        const newIds: Ids = {
            parentMessageId: response?.id,
            conversationId: response?.conversationId,
        };

        return [responseText, newIds];
    };

    private async sendMessageWithRetry(message: string, ids: Ids): Promise<ChatMessage | undefined> {
        if (this.api == null) {
            setFailed('The OpenAI API is not initialized');
            return undefined;
        }

        const opts: SendMessageOptions = {
            timeoutMs: this.options.openaiTimeoutMS,
            parentMessageId: ids.parentMessageId,
        };

        try {
            return await pRetry(() => this.api!.sendMessage(message, opts), {
                retries: this.options.openaiRetries,
            });
        } catch (e: unknown) {
            if (e instanceof ChatGPTError) {
                info(`Failed to send message to openai: ${e}, backtrace: ${e.stack}`);
            }
            return undefined;
        }
    }

    private extractResponseText(response: ChatMessage | undefined): string {
        if (response == null) {
            warning('openai response is null');
            return '';
        }

        let responseText = response.text;
        if (responseText.startsWith('with ')) {
            responseText = responseText.substring(5);
        }

        if (this.options.debug) {
            info(`openai responses: ${responseText}`);
        }

        return responseText;
    }
}
