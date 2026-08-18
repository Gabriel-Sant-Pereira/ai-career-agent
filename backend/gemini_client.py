import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY não encontrada no arquivo .env")

client = genai.Client(api_key=api_key)

# A SDK google-genai expõe erros de API em google.genai.errors, com
# ClientError (4xx, ex.: 404 modelo não encontrado, 429 cota excedida)
# e ServerError (5xx, ex.: 503 instabilidade momentânea do serviço).
# O import é protegido porque, se a versão instalada da SDK não expuser
# esse módulo, ainda queremos cair no fallback genérico em vez de
# quebrar o import inteiro do arquivo.
try:
    from google.genai import errors as genai_errors
    ERROS_DE_API = (genai_errors.ClientError, genai_errors.ServerError)
except ImportError:  # pragma: no cover
    ERROS_DE_API = tuple()

# Cadeia de fallback, na ordem definida:
#   🥇 gemini-3.5-flash       → cérebro principal (melhor qualidade)
#   🥈 gemini-3.5-flash-lite  → trabalho pesado / alto volume
#   🥉 gemma-4-31b-it         → fallback de volume absurdo / última linha
#
# Confirme o nome exato do modelo Gemma no Google AI Studio antes de
# ir pra produção — modelos Gemma costumam usar o sufixo "-it" para a
# versão instruction-tuned (a que entende instruções em vez de só
# completar texto), mas o nome exato pode variar por versão.
#
# NÃO fazem parte desta cadeia automática:
#   🔎 gemini-embedding-2 → gera vetores, não texto. Serve para busca
#      por similaridade (RAG "de verdade", com embeddings) — hoje o
#      projeto passa a base de conhecimento inteira no prompt, então
#      esse modelo fica reservado para uma futura versão com busca
#      vetorial.
#   🧠 gemini-3.6-flash → mantido fora do fallback automático porque
#      você já está usando ele separadamente para testes/benchmark.
MODELOS_FALLBACK = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemma-4-31b-it",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite"
]

# Códigos HTTP que justificam tentar o próximo modelo da lista:
# 404 modelo não encontrado/desativado, 429 cota excedida,
# 500 erro interno, 503 serviço temporariamente indisponível.
CODIGOS_PARA_FALLBACK = {404, 429, 500, 503}


def perguntar(prompt: str) -> str:
    """
    Envia um prompt para o Gemini, tentando cada modelo de
    MODELOS_FALLBACK em ordem até um responder com sucesso.

    Só avança para o próximo modelo quando o erro é do tipo que faz
    sentido tentar de novo em outro modelo (instabilidade, cota
    excedida, modelo indisponível). Outros erros — ex.: prompt
    bloqueado por segurança, chave de API inválida — são relançados
    na hora, porque trocar de modelo não resolveria o problema.

    Levanta RuntimeError com o último erro capturado se todos os
    modelos da lista falharem.
    """
    ultimo_erro = None

    for modelo in MODELOS_FALLBACK:
        try:
            response = client.models.generate_content(
                model=modelo,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                ),
            )
            return response.text

        except ERROS_DE_API as exc:
            codigo = getattr(exc, "code", None)
            print(f"[gemini_client] Modelo '{modelo}' falhou (HTTP {codigo}): {exc}")
            ultimo_erro = exc

            if codigo in CODIGOS_PARA_FALLBACK or codigo is None:
                # Erro "tentável": segue para o próximo modelo da lista.
                continue

            # Erro que não se resolve trocando de modelo (ex.: prompt
            # bloqueado por política de segurança, 400 malformado).
            raise

        except Exception as exc:  # noqa: BLE001
            # Rede fora do ar, timeout, ou qualquer erro que a SDK não
            # tenha categorizado como ClientError/ServerError. Ainda
            # vale tentar o próximo modelo antes de desistir.
            print(f"[gemini_client] Erro inesperado no modelo '{modelo}': {exc}")
            ultimo_erro = exc
            continue

    raise RuntimeError(
        f"Todos os modelos configurados falharam. Último erro: {ultimo_erro}"
    ) from ultimo_erro