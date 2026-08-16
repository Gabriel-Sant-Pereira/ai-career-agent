# AI Career Agent — Gabriel Santana

Portfólio interativo: um agente de IA que responde recrutadores estritamente
com base numa base de conhecimento verificada (currículo, experiências e
projetos), sempre indicando a fonte que fundamenta cada resposta.

## Estrutura

```
ai-career-agent/
├── backend/
│   ├── app.py              # API Flask (/api/chat, /api/sugestoes)
│   ├── gemini_client.py    # Integração com o Gemini (google-genai SDK)
│   ├── knowledge_base.py   # Carregamento dos documentos da base
│   ├── cli.py              # Versão original em linha de comando (opcional)
│   ├── requirements.txt
│   ├── .env.example
│   └── data/curriculo/     # currículo.txt, experiencias.txt, projetos.txt
└── frontend/
    ├── index.html
    ├── style.css
    └── script.js
```

## O que foi corrigido em relação à versão original

- `gemini_client.py` usava `client.interactions.create(...).output_text`,
  que não existe na SDK `google-genai` para geração simples de texto. Foi
  trocado por `client.models.generate_content(model=..., contents=...)`,
  que é a chamada correta.
- `knowledge_base.py` agora também expõe `carregar_documentos()`, que
  retorna um dicionário `{nome_do_arquivo: conteúdo}` — necessário para o
  backend indicar exatamente qual arquivo fundamentou cada resposta.
- O prompt agora pede ao modelo uma saída em **JSON estruturado**
  (`resposta`, `categoria`, `fontes`, `disponivel_na_base`), permitindo que
  a interface mostre de forma visual a fonte de cada resposta — reforçando
  na prática a regra de "não inventar informações".

## Como rodar

1. Instale as dependências:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Configure sua chave da API Gemini:

```bash
cp .env.example .env
# edite o .env e cole sua GEMINI_API_KEY
```

3. Suba o servidor:

```bash
python app.py
```

4. Abra **http://127.0.0.1:5000** no navegador — o Flask já serve o
   frontend a partir da pasta `frontend/`.

Se preferir abrir `frontend/index.html` diretamente (sem servir pelo
Flask), o `script.js` detecta isso e aponta as requisições para
`http://127.0.0.1:5000` automaticamente — basta manter o backend rodando.

## Deploy

Para publicar como portfólio (ex: Render, Railway, Fly.io):
- Suba o conteúdo de `backend/` como o serviço web (`python app.py` ou via
  `gunicorn app:app`), garantindo que a pasta `frontend/` esteja acessível
  no mesmo build (o Flask já a serve como estático).
- Configure `GEMINI_API_KEY` como variável de ambiente no serviço.
- Nunca commite o arquivo `.env` real.

## Próximos passos sugeridos

- Adicionar histórico de conversa (contexto multi-turno) no `/api/chat`.
- Adicionar rate limiting simples para evitar abuso do endpoint público.
- Registrar perguntas recebidas (sem dados sensíveis) para entender o que
  recrutadores mais perguntam.
