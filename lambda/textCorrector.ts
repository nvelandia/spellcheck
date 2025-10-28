import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { APIGatewayProxyResult, Handler } from 'aws-lambda';

interface LambdaEvent {
  text: string;
}

const client = new BedrockRuntimeClient({ region: 'us-east-1' });
const modelId = 'mistral.mistral-small-2402-v1:0';

export const handler: Handler<LambdaEvent, APIGatewayProxyResult> = async (
  event: any
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', event);

  // test desde el cms ==============================
  const allowedOrigin = 'https://nvelandia.cms.tycsports.com';

  // 2. Define los headers de CORS que devolverás
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Métodos que permites
    'Access-Control-Allow-Headers': 'Content-Type', // Headers que permites (añade "Authorization" si usas tokens)
  };

  if (event.requestContext.http.method === 'OPTIONS') {
    console.log('Respondiendo a petición OPTIONS (preflight)');

    return {
      statusCode: 204, // 204 No Content
      headers: corsHeaders,
      body: '', // Body vacío
    };
  }

  // test desde el cms ==============================

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
  [INST]
  Eres un corrector de textos experto en español, enfocado en deportes. 
Tu única función es actuar como una API de corrección de texto.
Analizarás un texto delimitado por <texto_a_corregir> y devolverás un objeto JSON.

El objeto JSON debe tener la siguiente estructura exacta:
{
  "text": "Aquí va el texto completo con todas las correcciones de ortografía y gramática aplicadas.",
  "errors": [
    { "word": "palabra original", "fix": "palabra corregida" },
    { "word": "otro error", "fix": "otra corrección" }
  ]
}

REGLAS ESTRICTAS:
1.  **JSON VÁLIDO**: Tu respuesta debe ser *solamente* un objeto JSON válido.
2.  **SIN CHAT**: NO añadas ningún texto, comentario o explicación antes o después del JSON.
3.  **ESTRUCTURA**: El JSON debe contener las claves "text" (string) y "errors" (array).
4.  **CASO VACÍO**: Si no hay errores, "text" será el texto original y "errors" DEBE ser un array vacío: [].

Aquí está el texto a analizar:
<texto_a_corregir>
${inputText}
</texto_a_corregir>

Genera el JSON.
[/INST]`;

  const payload = {
    prompt: prompt,
    max_tokens: 2000,
    temperature: 0.1,
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
      headers: corsHeaders,
      body: JSON.stringify({
        text: correctedText,
      }),
    };
  } catch (error) {
    console.error('Error al invocar Bedrock:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Error interno al procesar el texto.',
      }),
    };
  }
};
