/**
 * Mock AI Providers
 *
 * Provides mock implementations of AI provider SDKs for testing.
 * Simulates responses from Claude, OpenAI, and Gemini without making real API calls.
 */

/**
 * Mock Anthropic SDK
 */
export const mockAnthropicClient = {
  messages: {
    create: jest.fn(async (params: any) => {
      return {
        id: 'msg_test_' + Date.now(),
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Mock Claude response for testing',
          },
        ],
        model: params.model || 'claude-3-5-sonnet-20241022',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };
    }),
    stream: jest.fn(async function* (params: any) {
      yield {
        type: 'message_start',
        message: {
          id: 'msg_test_stream',
          type: 'message',
          role: 'assistant',
          content: [],
          model: params.model,
        },
      };
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Mock ' },
      };
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'streamed ' },
      };
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'response' },
      };
      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
      };
    }),
  },
};

/**
 * Mock OpenAI SDK
 */
export const mockOpenAIClient = {
  chat: {
    completions: {
      create: jest.fn(async (params: any) => {
        if (params.stream) {
          // Return async iterator for streaming
          return (async function* () {
            yield {
              id: 'chatcmpl_test',
              choices: [
                {
                  delta: { content: 'Mock ' },
                  finish_reason: null,
                },
              ],
            };
            yield {
              id: 'chatcmpl_test',
              choices: [
                {
                  delta: { content: 'OpenAI ' },
                  finish_reason: null,
                },
              ],
            };
            yield {
              id: 'chatcmpl_test',
              choices: [
                {
                  delta: { content: 'response' },
                  finish_reason: 'stop',
                },
              ],
            };
          })();
        }

        // Non-streaming response
        return {
          id: 'chatcmpl_test',
          object: 'chat.completion',
          created: Date.now(),
          model: params.model || 'gpt-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Mock OpenAI response for testing',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        };
      }),
    },
  },
};

/**
 * Mock Gemini SDK
 */
export const mockGeminiModel = {
  generateContent: jest.fn(async (params: any) => {
    return {
      response: {
        text: () => 'Mock Gemini response for testing',
        candidates: [
          {
            content: {
              parts: [{ text: 'Mock Gemini response for testing' }],
              role: 'model',
            },
            finishReason: 'STOP',
          },
        ],
      },
    };
  }),
  generateContentStream: jest.fn(async function* (params: any) {
    yield {
      text: () => 'Mock ',
      candidates: [
        {
          content: {
            parts: [{ text: 'Mock ' }],
            role: 'model',
          },
        },
      ],
    };
    yield {
      text: () => 'Gemini ',
      candidates: [
        {
          content: {
            parts: [{ text: 'Gemini ' }],
            role: 'model',
          },
        },
      ],
    };
    yield {
      text: () => 'stream',
      candidates: [
        {
          content: {
            parts: [{ text: 'stream' }],
            role: 'model',
          },
          finishReason: 'STOP',
        },
      ],
    };
  }),
};

export const mockGeminiClient = {
  getGenerativeModel: jest.fn(() => mockGeminiModel),
};

/**
 * Reset all AI provider mocks
 */
export function resetAIProviderMocks(): void {
  mockAnthropicClient.messages.create.mockClear();
  mockAnthropicClient.messages.stream.mockClear();
  mockOpenAIClient.chat.completions.create.mockClear();
  mockGeminiModel.generateContent.mockClear();
  mockGeminiModel.generateContentStream.mockClear();
  mockGeminiClient.getGenerativeModel.mockClear();
}

/**
 * Mock validation responses
 */
export const mockValidationSuccess = () => {
  mockAnthropicClient.messages.create.mockResolvedValueOnce({
    id: 'msg_validation',
    content: [{ type: 'text', text: 'Valid' }],
  } as any);
};

export const mockValidationFailure = (errorMessage: string = 'Invalid API key') => {
  mockAnthropicClient.messages.create.mockRejectedValueOnce(
    new Error(errorMessage)
  );
};
