from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_DIR = BASE_DIR / "data" / "curriculo"


def carregar_documentos() -> dict[str, str]:
    """
    Carrega cada arquivo .txt da base de conhecimento individualmente,
    mantendo o nome do arquivo como chave. Isso permite que o agente
    referencie a origem exata de cada resposta (grounding).
    """
    documentos = {}

    for arquivo in sorted(KNOWLEDGE_DIR.glob("*.txt")):
        documentos[arquivo.name] = arquivo.read_text(encoding="utf-8")

    if not documentos:
        raise FileNotFoundError(
            "Nenhum documento encontrado na base de conhecimento."
        )

    return documentos


def carregar_base_conhecimento() -> str:
    """Mantido para compatibilidade: retorna todos os documentos concatenados."""
    documentos = carregar_documentos()

    blocos = [
        f"\n===== {nome.upper()} =====\n{conteudo}"
        for nome, conteudo in documentos.items()
    ]

    return "\n".join(blocos)
