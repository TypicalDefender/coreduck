import { getBooleanInput, getInput, getMultilineInput, setFailed, warning } from '@actions/core';
import { Bot } from './bot';
import { OpenAIOptions, Options } from './options';
import { Prompts } from './prompts';
import { codeReview } from './review';
import { handleReviewComment } from './review-comment';

function initializeOptions(): Options {
    const options = new Options(
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
    options.print();
    return options;

function initializeBots(options: Options): { lightBot: Bot | null, heavyBot: Bot | null } {
    let lightBot: Bot | null = null;
    let heavyBot: Bot | null = null;

    try {
        lightBot = new Bot(options, new OpenAIOptions(options.openaiLightModel, options.lightTokenLimits));
    } catch (e: any) {
        warning(`Skipped: failed to create summary bot, please check your openai_api_key: ${e}, backtrace: ${e.stack}`);
    }

    try {
        heavyBot = new Bot(options, new OpenAIOptions(options.openaiHeavyModel, options.heavyTokenLimits));
    } catch (e: any) {
        warning(`Skipped: failed to create review bot, please check your openai_api_key: ${e}, backtrace: ${e.stack}`);
    }

    return { lightBot, heavyBot };

async function handleEvent(lightBot: Bot | null, heavyBot: Bot | null, options: Options, prompts: Prompts): Promise<void> {
    if (
        process.env.GITHUB_EVENT_NAME === 'pull_request' ||
        process.env.GITHUB_EVENT_NAME === 'pull_request_target'
    ) {
        await codeReview(lightBot, heavyBot, options, prompts);
    } else if (process.env.GITHUB_EVENT_NAME === 'pull_request_review_comment') {
        await handleReviewComment(heavyBot, options, prompts);
    } else {
        warning('Skipped: this action only works on push events or pull_request');
    }
}

function setupErrorHandling(): void {
    process
        .on('unhandledRejection', (reason, p) => {
            warning(`Unhandled Rejection at Promise: ${reason}, promise is ${p}`);
        })
        .on('uncaughtException', (e: any) => {
            warning(`Uncaught Exception thrown: ${e}, backtrace: ${e.stack}`);
        });
