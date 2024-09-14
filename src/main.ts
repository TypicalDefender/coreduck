import { getBooleanInput, getInput, getMultilineInput, setFailed, warning } from '@actions/core';
import { Bot } from './bot';
import { OpenAIOptions, Options } from './options';
import { Prompts } from './prompts';
import { codeReview } from './review';
import { handleReviewComment } from './review-comment';

async function run(): Promise<void> {
    const options = createOptions();
    options.print();

    const prompts = new Prompts(
        getInput('summarize'),
        getInput('summarize_release_notes')
    );

    const [lightBot, heavyBot] = await createBots(options);
    if (!lightBot || !heavyBot) return;

    try {
        await handleGitHubEvent(lightBot, heavyBot, options, prompts);
    } catch (error: any) {
        handleError(error);
    }
}

function createOptions(): Options {
    return new Options(
        getBooleanInput('debug'),
        getBooleanInput('disable_review'),
        getBooleanInput('disable_release_notes'),
        getInput('max_files'),
        getBooleanInput('review_simple_changes'),
        getBooleanInput('review_comment_lgtm'),
        getMultilineInput('path_filters'),
        getInput('system_message'),
        getInput('openai_light_model'),
        getInput('openai_heavy_model'),
        getInput('openai_model_temperature'),
        getInput('openai_retries'),
        getInput('openai_timeout_ms'),
        getInput('openai_concurrency_limit'),
        getInput('github_concurrency_limit'),
        getInput('openai_base_url'),
        getInput('language')
    );
}

async function createBots(options: Options): Promise<[Bot | null, Bot | null]> {
    const lightBot = await createBot(options, options.openaiLightModel, options.lightTokenLimits, 'summary');
    const heavyBot = await createBot(options, options.openaiHeavyModel, options.heavyTokenLimits, 'review');
    return [lightBot, heavyBot];
}

async function createBot(options: Options, model: string, tokenLimits: any, botType: string): Promise<Bot | null> {
    try {
        return new Bot(options, new OpenAIOptions(model, tokenLimits));
    } catch (error: any) {
        warning(`Skipped: failed to create ${botType} bot, please check your openai_api_key: ${error}, backtrace: ${error.stack}`);
        return null;
    }
}

async function handleGitHubEvent(lightBot: Bot, heavyBot: Bot, options: Options, prompts: Prompts): Promise<void> {
    const eventName = process.env.GITHUB_EVENT_NAME;
    
    if (eventName === 'pull_request' || eventName === 'pull_request_target') {
        await codeReview(lightBot, heavyBot, options, prompts);
    } else if (eventName === 'pull_request_review_comment') {
        await handleReviewComment(heavyBot, options, prompts);
    } else {
        warning('Skipped: this action only works on push events or pull_request');
    }
}

function handleError(error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stackTrace = error.stack || '';
    setFailed(`Failed to run: ${errorMessage}, backtrace: ${stackTrace}`);
}

process
    .on('unhandledRejection', (reason, promise) => {
        warning(`Unhandled Rejection at Promise: ${reason}, promise is ${promise}`);
    })
    .on('uncaughtException', (error: any) => {
        warning(`Uncaught Exception thrown: ${error}, backtrace: ${error.stack}`);
    });

await run();
