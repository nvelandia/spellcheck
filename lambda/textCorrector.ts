import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { APIGatewayProxyResult, Handler } from 'aws-lambda';

interface LambdaEvent {
  text: string;
}

const client = new BedrockRuntimeClient({ region: 'us-east-1' });
const modelId = 'mistral.mistral-large-2402-v1:0';

export const handler: Handler<LambdaEvent, APIGatewayProxyResult> = async (
  event: any
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', event);

  // test desde el cms ==============================
  const allowedOrigin = 'https://nvelandia.cms.tycsports.com';

  // 2. Define los headers de CORS que devolverás
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
Actúa como un corrector ortográfico experto de un medio de deportes.

Te voy a pasar un texto el cual deberás corregir ortográficamente (incluyendo acentuación de nombres propios).

También debes corregir errores gramaticales contextuales o palabras usadas incorrectamente. Dado que eres un experto en deportes, presta especial atención a la terminología y jerga deportiva, corrigiendo palabras que sean incorrectas en ese contexto específico, incluyendo homófonos o parónimos (ej. 'saga' en lugar de 'zaga' para la defensa, 'valla' en lugar de 'vaya', 'actitud' en lugar de 'aptitud' si el contexto lo requiere). Corrige también confusiones gramaticales (ej. 'desgarró' en lugar de 'desgarro', 'a' en lugar de 'ha', 'porque' en lugar de 'por qué'), aunque la palabra original esté bien escrita por sí sola.

No modifiques la redacción general.

REGLA CRÍTICA: El texto contiene etiquetas HTML. Estas etiquetas deben mantenerse 100% intactas, sin alteración, y en su posición original. No puedes añadir, eliminar, modificar o corromper ninguna etiqueta HTML (como <p>, </p>, <a href...>, <b>, </div>, etc.). Tu única tarea es corregir el texto dentro de estas etiquetas.

El texto también utiliza el separador /***/ para dividir los bloques.

Debes devolver tu respuesta en un ÚNICO objeto JSON válido. NO añadas ningún texto, comentario o explicación antes o después del JSON.

El JSON debe tener la siguiente estructura:

Una clave principal llamada blocks.

Dentro de blocks, anidarás cada segmento de texto (separado por /***/) en claves secuenciales: block_1, block_2, block_3, etc.

Una clave principal llamada corrections_made.

Dentro de corrections_made, incluirás un array de objetos. Cada objeto debe tener dos claves: original (con la palabra incorrecta) y corrected (con la palabra corregida). 
Si no hay correcciones, este array debe estar vacío. No siempre el texto tendrá errores.

Antes de finalizar, verifica que todas las etiquetas HTML del texto de salida son idénticas y están en la misma posición que en el texto de entrada.

A continuación, el texto a corregir:
${inputText}
[/INST]
`;

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

    const responseBodyRaw = response.body;
    const responseBodyString = new TextDecoder().decode(responseBodyRaw);
    const responseBodyJson = JSON.parse(responseBodyString);
    const textOutput = responseBodyJson.outputs[0].text;

    const jsonMatch = textOutput.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      throw new Error('Mistral no devolvió un JSON válido.');
    }
    const jsonStringLimpio = jsonMatch[0];
    const jsonObject = JSON.parse(jsonStringLimpio);

    console.log('Bedrock:', jsonObject);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonObject),
    };
  } catch (error) {
    console.error('Error al invocar Bedrock:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Error al procesar la respuesta de Bedrock',
      }),
    };
  }
};
