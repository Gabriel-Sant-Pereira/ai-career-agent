const API_BASE = window.location.origin.includes("5000") || window.location.protocol === "file:"
  ? "http://127.0.0.1:5000"
  : "";

const chatLog = document.getElementById("chatLog");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const suggestionsEl = document.getElementById("suggestions");
const errorBanner = document.getElementById("errorBanner");

const CATEGORY_LABELS = {
  experiencia_profissional: "Experiência profissional",
  projeto: "Projeto pessoal",
  formacao: "Formação",
  competencia_tecnica: "Competência técnica",
  indisponivel: "Não documentado",
  geral: "Geral",
};

function scrollToBottom() {
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addUserMessage(text) {
  const div = document.createElement("div");
  div.className = "msg user";
  div.textContent = text;
  chatLog.appendChild(div);
  scrollToBottom();
}

function addTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "msg agent";
  wrapper.id = "typingIndicator";
  wrapper.innerHTML = `
    <div class="agent-card">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>`;
  chatLog.appendChild(wrapper);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

function addAgentMessage(data) {
  const wrapper = document.createElement("div");
  wrapper.className = "msg agent";

  const categoria = data.categoria || "geral";
  const categoriaLabel = CATEGORY_LABELS[categoria] || categoria;
  const disponivel = data.disponivel_na_base !== false;
  const fontes = Array.isArray(data.fontes) ? data.fontes : [];

  const metaTags = [];
  metaTags.push(`<span class="tag category">${categoriaLabel}</span>`);

  if (disponivel && fontes.length) {
    fontes.forEach((f) => {
      metaTags.push(`<span class="tag source">fonte: ${f}</span>`);
    });
  } else if (!disponivel) {
    metaTags.push(`<span class="tag unavailable">não encontrado na base</span>`);
  }

  wrapper.innerHTML = `
    <div class="agent-card">
      <p></p>
      <div class="agent-meta">${metaTags.join("")}</div>
    </div>`;

  wrapper.querySelector("p").textContent = data.resposta || "Sem resposta.";
  chatLog.appendChild(wrapper);
  scrollToBottom();
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.style.display = "block";
}

function hideError() {
  errorBanner.style.display = "none";
}

async function enviarPergunta(pergunta) {
  if (!pergunta.trim()) return;

  hideError();
  addUserMessage(pergunta);
  chatInput.value = "";
  sendBtn.disabled = true;
  addTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pergunta }),
    });

    const data = await res.json();
    removeTypingIndicator();

    if (!res.ok) {
      showError(data.erro || "Não foi possível consultar o agente agora.");
      return;
    }

    addAgentMessage(data);
  } catch (err) {
    removeTypingIndicator();
    showError(
      "Não consegui me conectar ao backend. Verifique se o servidor Flask está rodando em " + API_BASE
    );
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

sendBtn.addEventListener("click", () => enviarPergunta(chatInput.value));
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") enviarPergunta(chatInput.value);
});

async function carregarSugestoes() {
  try {
    const res = await fetch(`${API_BASE}/api/sugestoes`);
    const perguntas = await res.json();

    suggestionsEl.innerHTML = "";
    perguntas.forEach((p) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "suggestion-chip";
      chip.textContent = p;
      chip.addEventListener("click", () => enviarPergunta(p));
      suggestionsEl.appendChild(chip);
    });
  } catch (err) {
    // silencioso: sugestões são um extra, não bloqueiam o uso do chat
  }
}

carregarSugestoes();

/* =========================================================
   PREMIUM INTERACTION LAYER
   ========================================================= */

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

/* ---------- scroll progress bar ---------- */
(function scrollProgress() {
  const bar = document.getElementById("scrollProgress");
  if (!bar) return;

  function update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + "%";
  }

  window.addEventListener("scroll", update, { passive: true });
  update();
})();

/* ---------- live clock (Suzano/SP) ---------- */
(function liveClock() {
  const el = document.getElementById("navClock");
  if (!el) return;

  function tick() {
    const now = new Date();
    const formatted = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    el.textContent = formatted + " · Suzano/SP";
  }

  tick();
  setInterval(tick, 30000);
})();

/* ---------- scroll reveal ---------- */
(function scrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  if (prefersReducedMotion) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el) => observer.observe(el));
})();

/* ---------- animated number counters ---------- */
(function counters() {
  const items = document.querySelectorAll("[data-counter]");
  if (!items.length) return;

  function animate(el) {
    const target = parseInt(el.dataset.target, 10) || 0;
    if (prefersReducedMotion) {
      el.textContent = target;
      return;
    }
    const duration = 900;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );

  items.forEach((el) => observer.observe(el));
})();

/* ---------- scramble / decode text effect (runs once on load) ---------- */
(function scrambleText() {
  if (prefersReducedMotion) return;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const el = document.querySelector("[data-scramble]");
  if (!el) return;

  const finalText = el.textContent;
  const duration = 500;
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const revealCount = Math.floor(progress * finalText.length);

    let out = "";
    for (let i = 0; i < finalText.length; i++) {
      if (i < revealCount) {
        out += finalText[i];
      } else if (finalText[i] === " ") {
        out += " ";
      } else {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    el.textContent = out;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = finalText;
    }
  }
  requestAnimationFrame(frame);
})();

/* ---------- spotlight cursor tracking ---------- */
(function spotlightTracking() {
  if (isCoarsePointer) return;
  const cards = document.querySelectorAll(".spotlight");
  if (!cards.length) return;

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--mx", x + "%");
      card.style.setProperty("--my", y + "%");
    });
  });
})();

/* ---------- magnetic buttons ---------- */
(function magneticButtons() {
  if (isCoarsePointer || prefersReducedMotion) return;
  const buttons = document.querySelectorAll(".magnetic");

  buttons.forEach((btn) => {
    const strength = 12;

    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const relY = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      btn.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`;
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translate(0, 0)";
    });
  });
})();

/* ---------- data particle canvas (hero background) ---------- */
(function dataCanvas() {
  const canvas = document.getElementById("dataCanvas");
  if (!canvas || prefersReducedMotion) return;

  const ctx = canvas.getContext("2d");
  const hero = canvas.closest(".hero");
  let particles = [];
  let width, height;
  let mouse = { x: null, y: null };
  let running = true;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const COLOR_DOT = "53, 214, 192";
  const COLOR_LINE = "53, 214, 192";
  const LINK_DIST = 130;
  const MOUSE_DIST = 160;

  function resize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = isCoarsePointer ? 34 : Math.min(70, Math.floor((width * height) / 16000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.6,
    }));
  }

  function step() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${COLOR_DOT}, 0.55)`;
      ctx.fill();
    });

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${COLOR_LINE}, ${0.14 * (1 - dist / LINK_DIST)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      if (mouse.x !== null) {
        const dx = particles[i].x - mouse.x;
        const dy = particles[i].y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(240, 169, 62, ${0.22 * (1 - dist / MOUSE_DIST)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(step);
  }

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        running = entry.isIntersecting;
        if (running) requestAnimationFrame(step);
      });
    },
    { threshold: 0 }
  );
  visibilityObserver.observe(hero);

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(step);
})();