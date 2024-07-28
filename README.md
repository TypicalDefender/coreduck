# Coreduck AI code reviewer


[![GitHub](https://img.shields.io/github/last-commit/TypicalDefender/coreduck/main?style=flat-square)](https://github.com/TypicalDefender/coreduck/commits/main)

## Overview

Coreduck is an AI-based code reviewer and summarizer for GitHub pull requests using OpenAI models. It is designed to be used as a GitHub Action and can be configured to run on every pull request and review comments. 

## How Coreduck Works:

1. Get the list of files that are included in the pull request.
2. For each file, get the present contents of the file from the target destination branch of the PR.
3. For each file, get the contents of the file from the source branch in the PR.
4. Create a diff of them.
5. For each file in the PR, send the diff to ChatGPT for creating a summary of the changes alongside a flag indicating whether there is something that needs to be reviewed or changed.
6. Once we have the summaries and the filenames that need to be reviewed, we send files in batches of 10 to get a combined summary of the complete PR.
7. For each file that needs to be reviewed, we make calls to get the review comment.
8. We summarize everything at the end to create a review summary, summary, and review comments which get committed at the last.

## Reviewer Features:

- **PR Summarization**: Generates a summary and release notes of the changes in the pull request.
- **Line-by-line code change suggestions**: Reviews the changes line by line and provides code change suggestions.
- **Continuous, incremental reviews**: Reviews are performed on each commit within a pull request, rather than a one-time review on the entire pull request.
- **Cost-effective and reduced noise**: Incremental reviews save on OpenAI costs and reduce noise by tracking changed files between commits and the base of the pull request.
- **"Light" model for summary**: Designed to be used with a "light" summarization model (e.g., `gpt-3.5-turbo`) and a "heavy" review model (e.g., `gpt-4`). _For best results, use `gpt-4` as the "heavy" model, as thorough code review needs strong reasoning abilities._
- **Chat with bot**: Supports conversation with the bot in the context of lines of code or entire files, useful for providing context, generating test cases, and reducing code complexity.
- **Smart review skipping**: By default, skips in-depth review for simple changes (e.g., typo fixes) and when changes look good for the most part. It can be disabled by setting `review_simple_changes` and `review_comment_lgtm` to `true`.
- **Customizable prompts**: Tailor the `system_message`, `summarize`, and `summarize_release_notes` prompts to focus on specific aspects of the review process or even change the review objective.

To use this tool, you need to add the provided YAML file to your repository and configure the required environment variables, such as `GITHUB_TOKEN` and `OPENAI_API_KEY`.


## Install instructions

Coreduck runs as a GitHub Action. Add the below file to your repository at `.github/workflows/coreduck.yml`

```yaml
name: Code Review using coreduck

on:
  pull_request:
    types: [opened, synchronize, reopened]
  pull_request_review_comment:
    types: [created]

permissions:
  pull-requests: write
  contents: read

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: TypicalDefender/coreduck@main
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        with:
          debug: false
          review_simple_changes: false
          review_comment_lgtm: false
          disable_release_notes: true
