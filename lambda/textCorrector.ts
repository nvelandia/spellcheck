import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { APIGatewayProxyResult, Handler } from 'aws-lambda';

interface LambdaEvent {
  text: string;
}

const client = new BedrockRuntimeClient({ region: 'us-east-1' });
const modelId = 'mistral.mistral-7b-instruct-v0:2';

export const handler: Handler<LambdaEvent, APIGatewayProxyResult> = async (
  event: any
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', event);

  let inputData;

  if (event.body) {
    inputData = JSON.parse(event.body);
  }

  if (!inputData || !inputData.text) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'El campo "text" es requerido.' }),
    };
  }

  const inputText = inputData.text;

  const prompt = `
  Corrige ortografía y gramática del texto. Devuelve únicamente el texto original, sin ninguna explicación adicional.
  Texto original: ${inputText}`;

  const payload = {
    prompt: prompt,
    max_tokens: 2000,
    temperature: 0.2,
    top_p: 0.8,
    top_k: 50,
  };

  const command = new InvokeModelCommand({
    modelId: modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const correctedText = responseBody.outputs[0].text.trim();

    return {
      statusCode: 200,
      body: JSON.stringify({
        text: correctedText,
      }),
    };
  } catch (error) {
    console.error('Error al invocar Bedrock:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error interno al procesar el texto.',
      }),
    };
  }
};
