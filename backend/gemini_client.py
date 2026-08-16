import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY não encontrada no arquivo .env")

client = genai.Client(api_key=api_key)

MODEL = "gemini-3.6-flash"


def perguntar(prompt: str) -> str:
    """
    Envia um prompt para o modelo Gemini e retorna o texto da resposta.

    Observação: a SDK google-genai expõe geração de conteúdo via
    client.models.generate_content(model=..., contents=...), retornando
    um objeto com o atributo .text — não client.interactions.create().
    """
    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.3,
        ),
    )

    return response.text
