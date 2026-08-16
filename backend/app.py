import json
import re
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from gemini_client import perguntar
from knowledge_base import carregar_documentos

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
CORS(app)

SYSTEM_INSTRUCTIONS = """Você é o AI Career Agent de Gabriel Santana, um assistente que
responde perguntas de recrutadores sobre a carreira dele.

REGRAS OBRIGATÓRIAS:
1. Use exclusivamente as informações presentes na BASE DE CONHECIMENTO abaixo.
2. Nunca invente experiências, tecnologias, resultados, métricas ou datas.
3. Diferencie claramente experiência profissional, projetos pessoais e formação/estudos.
4. Nunca apresente um projeto pessoal ou em andamento como experiência profissional.
5. Se a informação perguntada não estiver na base, diga isso claramente em vez de inventar.
6. Responda de forma profissional, objetiva, natural e em português do Brasil.
7. Você não é o Gabriel — você é um agente de IA que representa a base profissional dele.

FORMATO DE SAÍDA:
Responda SOMENTE com um JSON válido (sem markdown, sem crases, sem texto fora do JSON),
seguindo exatamente este formato:

{
  "resposta": "texto da resposta para o recrutador",
  "categoria": "experiencia_profissional | projeto | formacao | competencia_tecnica | indisponivel | geral",
  "fontes": ["nome_do_arquivo.txt", "..."],
  "disponivel_na_base": true
}

- "fontes" deve conter apenas os nomes de arquivo da BASE DE CONHECIMENTO que
  realmente fundamentam a resposta (ex: "experiencias.txt", "projetos.txt", "curriculo.txt").
- Se a informação não estiver disponível, use "disponivel_na_base": false,
  "fontes": [] e explique isso educadamente no campo "resposta".
"""


def montar_prompt(pergunta: str, documentos: dict[str, str]) -> str:
    base = "\n".join(
        f"\n===== {nome} =====\n{conteudo}" for nome, conteudo in documentos.items()
    )
    return f"""{SYSTEM_INSTRUCTIONS}

BASE DE CONHECIMENTO:
{base}

PERGUNTA DO RECRUTADOR:
{pergunta}
"""


def extrair_json(texto: str) -> dict:
    """Remove eventuais cercas de markdown e faz o parse do JSON retornado pelo modelo."""
    limpo = re.sub(r"^```(json)?|```$", "", texto.strip(), flags=re.MULTILINE).strip()

    try:
        return json.loads(limpo)
    except json.JSONDecodeError:
        # fallback: se o modelo não retornar JSON válido, devolve o texto puro
        return {
            "resposta": texto.strip(),
            "categoria": "geral",
            "fontes": [],
            "disponivel_na_base": True,
        }


@app.route("/api/chat", methods=["POST"])
def chat():
    payload = request.get_json(silent=True) or {}
    pergunta = (payload.get("pergunta") or "").strip()

    if not pergunta:
        return jsonify({"erro": "Envie uma pergunta no campo 'pergunta'."}), 400

    try:
        documentos = carregar_documentos()
        prompt = montar_prompt(pergunta, documentos)
        resposta_bruta = perguntar(prompt)
        resultado = extrair_json(resposta_bruta)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"erro": f"Erro ao consultar o agente: {exc}"}), 500

    return jsonify(resultado)


@app.route("/api/sugestoes", methods=["GET"])
def sugestoes():
    return jsonify(
        [
            "Quais tecnologias ele domina?",
            "Conte sobre a experiência atual no Itaú",
            "O que foi o projeto do Hackathon?",
            "Ele tem experiência com Machine Learning?",
            "Qual a formação acadêmica dele?",
            "Ele tem experiência com AWS?",
        ]
    )


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
