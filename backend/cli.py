from gemini_client import perguntar
from knowledge_base import carregar_base_conhecimento


def main():
    base_conhecimento = carregar_base_conhecimento()

    pergunta = input("\nRecrutador: ")

    prompt = f"""
Você é o AI Career Agent de Gabriel Santana.

Sua função é responder perguntas de recrutadores sobre Gabriel
utilizando exclusivamente as informações presentes na base de conhecimento.

REGRAS:
1. Não invente experiências, tecnologias, resultados ou informações.
2. Não transforme projetos pessoais em experiências profissionais.
3. Diferencie experiência profissional, projetos e estudos.
4. Se a informação não estiver na base, diga claramente que ela não está disponível.
5. Responda de forma profissional, objetiva e natural.
6. Não diga que você é o Gabriel. Você é um agente de IA que representa a base profissional dele.

BASE DE CONHECIMENTO:
{base_conhecimento}

PERGUNTA DO RECRUTADOR:
{pergunta}
"""

    resposta = perguntar(prompt)

    print("\nAI Career Agent:")
    print(resposta)


if __name__ == "__main__":
    main()
