import { get_encoding as getEncoding } from '@dqbd/tiktoken';

const tokenizer = getEncoding('cl100k_base');

export function encode(input: string): Uint32Array {
    return tokenizer.encode(input);
}

export function getTokenCount(input: string): number {
    const cleanedInput = input.replace(/<\|endoftext\|>/g, '');
    return encode(cleanedInput).length;
}