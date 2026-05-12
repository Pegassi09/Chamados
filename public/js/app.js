const API = 'http://localhost:3000';

const socket = io(API);

const body = document.body;

/* =========================
   SOCKET.IO
========================= */

socket.on(
    'connect',
    () => {

        console.log(
            'Socket conectado'
        );
    }
);

socket.on(
    'mensagemRecebida',
    (dados) => {

        if (
            window.chamadoAbertoId ==
            dados.chamado_id
        ) {

            abrirChamado(
                dados.chamado_id
            );
        }

        carregarMeusChamados();

        if (
            usuarioLogado?.tipo ===
            'superadmin'
        ) {

            carregarChamadosAdmin();
        }
    }
);

socket.on(
    'notificacao',
    (dados) => {

        mostrarToast(
            dados.mensagem
        );

        if (
            usuarioLogado?.tipo ===
            'superadmin'
        ) {

            carregarAtividades();
        }
    }
);

/* =========================
   TOAST
========================= */

function mostrarToast(
    mensagem
) {

    let container =
        document.getElementById(
            'toast-container'
        );

    if (!container) {

        container =
            document.createElement(
                'div'
            );

        container.id =
            'toast-container';

        document.body.appendChild(
            container
        );
    }

    const toast =
        document.createElement(
            'div'
        );

    toast.className =
        'toast-notificacao';

    toast.innerText =
        mensagem;

    container.appendChild(
        toast
    );

    setTimeout(() => {

        toast.remove();

    }, 4000);
}

/* =========================
   FILTROS
========================= */

function filtrarChamados(
    chamados
) {

    const busca =
        document.getElementById(
            'filtro-busca'
        )?.value
            ?.toLowerCase() || '';

    const status =
        document.getElementById(
            'filtro-status'
        )?.value || '';

    const prioridade =
        document.getElementById(
            'filtro-prioridade'
        )?.value || '';

    return chamados.filter(
        (c) => {

            const matchBusca =
                c.titulo
                    .toLowerCase()
                    .includes(
                        busca
                    );

            const matchStatus =
                !status ||
                c.status ===
                    status;

            const matchPrioridade =
                !prioridade ||
                c.prioridade ===
                    prioridade;

            return (
                matchBusca &&
                matchStatus &&
                matchPrioridade
            );
        }
    );
}

/* =========================
   TEMA
========================= */

function aplicarTema() {

    const temaSalvo =
        localStorage.getItem('theme') || 'light';

    if (temaSalvo === 'dark') {

        body.classList.add('dark');

    } else {

        body.classList.remove('dark');
    }

    atualizarIconeTema();
}

function atualizarIconeTema() {

    const botoes =
        document.querySelectorAll('.theme-btn');

    botoes.forEach((botao) => {

        botao.innerHTML =
            body.classList.contains('dark')
                ? '☀️'
                : '🌙';
    });
}

function toggleTheme() {

    body.classList.toggle('dark');

    localStorage.setItem(
        'theme',
        body.classList.contains('dark')
            ? 'dark'
            : 'light'
    );

    atualizarIconeTema();
}

aplicarTema();

/* =========================
   TOKEN
========================= */

function getToken() {

    return localStorage.getItem('token');
}

function getHeaders(json = true) {

    const headers = {};

    if (json) {

        headers['Content-Type'] =
            'application/json';
    }

    const token = getToken();

    if (token) {

        headers.Authorization =
            `Bearer ${token}`;
    }

    return headers;
}

/* =========================
   ELEMENTOS
========================= */

const loginScreen =
    document.getElementById(
        'login-screen'
    );

const sistemaScreen =
    document.getElementById(
        'sistema-screen'
    );

const adminArea =
    document.getElementById(
        'admin-area'
    );

const botaoAdmin =
    document.getElementById(
        'botao-admin'
    );

/* =========================
   USUÁRIO LOGADO
========================= */

let usuarioLogado = null;

/* =========================
   STATUS
========================= */

const STATUS_CORES = {

    'Novo': 'status-novo',

    'Pendente': 'status-pendente',

    'Em andamento': 'status-andamento',

    'Fechado': 'status-fechado'
};

/* =========================
   LOGIN
========================= */

const loginForm =
    document.getElementById(
        'login-form'
    );

if (loginForm) {

    loginForm.addEventListener(
        'submit',
        async (e) => {

            e.preventDefault();

            const usuario =
                document.getElementById(
                    'usuario'
                ).value.trim();

            const senha =
                document.getElementById(
                    'senha'
                ).value.trim();

            try {

                const resposta =
                    await fetch(
                        `${API}/login`,
                        {

                            method: 'POST',

                            headers:
                                getHeaders(),

                            body: JSON.stringify({

                                usuario,
                                senha
                            })
                        }
                    );

                const dados =
                    await resposta.json();

                if (!dados.sucesso) {

                    alert(
                        dados.mensagem
                    );

                    return;
                }

                localStorage.setItem(
                    'token',
                    dados.token
                );

                iniciarSistema();

            } catch (erro) {

                console.error(erro);

                alert(
                    'Erro ao conectar'
                );
            }
        }
    );
}

/* =========================
   AUTO LOGIN
========================= */

if (getToken()) {

    iniciarSistema();
}

/* =========================
   INICIAR SISTEMA
========================= */

async function iniciarSistema() {

    try {

        const resposta =
            await fetch(
                `${API}/validar-token`,
                {
                    headers:
                        getHeaders(false)
                }
            );

        if (!resposta.ok) {

            logout();

            return;
        }

        const dados =
            await resposta.json();

        usuarioLogado =
            dados.usuario;

        loginScreen.style.display =
            'none';

        sistemaScreen.style.display =
            'flex';

        mostrarPainel(
            'painel-usuario'
        );

        carregarMeusChamados();

        if (
            usuarioLogado.tipo ===
            'superadmin'
        ) {

            if (botaoAdmin) {

                botaoAdmin.style.display =
                    'flex';
            }

            carregarUsuarios();

            carregarChamadosAdmin();

            carregarDashboardAdmin();

            carregarAtividades();

        } else {

            if (botaoAdmin) {

                botaoAdmin.style.display =
                    'none';
            }
        }

    } catch (erro) {

        console.error(erro);

        logout();
    }
}

/* =========================
   LOGOUT
========================= */

function logout() {

    localStorage.clear();

    location.reload();
}

/* =========================
   PAINÉIS
========================= */

function mostrarPainel(id) {

    if (
        id === 'admin-area' &&
        usuarioLogado?.tipo !==
            'superadmin'
    ) {

        alert(
            'Acesso negado'
        );

        return;
    }

    document
        .querySelectorAll('.painel')
        .forEach((painel) => {

            painel.style.display =
                'none';
        });

    const painel =
        document.getElementById(id);

    if (painel) {

        painel.style.display =
            'block';
    }

    document
        .querySelectorAll('.menu-item')
        .forEach((botao) => {

            botao.classList.remove(
                'active'
            );
        });

    const botao =
        document.querySelector(
            `[data-painel="${id}"]`
        );

    if (botao) {

        botao.classList.add(
            'active'
        );
    }
}

/* =========================
   CHAMADOS USUÁRIO
========================= */

async function carregarMeusChamados() {

    const tabela =
        document.getElementById(
            'lista-meus-chamados'
        );

    if (!tabela) return;

    try {

        const resposta =
            await fetch(
                `${API}/chamados`,
                {

                    headers:
                        getHeaders(false)
                }
            );

        let chamados =
            await resposta.json();

        chamados =
            chamados.filter(
                c =>
                    c.usuario ===
                    usuarioLogado.usuario
            );

        chamados =
            filtrarChamados(
                chamados
            );

        tabela.innerHTML = '';

        chamados.forEach((chamado) => {

            tabela.innerHTML += `
                <tr>

                    <td>${chamado.id}</td>

                    <td>${chamado.titulo}</td>

                    <td>${chamado.categoria}</td>

                    <td>${chamado.tipoProblema}</td>

                    <td>${chamado.prioridade || 'Média'}</td>

                    <td>
                        <span class="
                            status-badge
                            ${STATUS_CORES[chamado.status]}
                        ">
                            ${chamado.status}
                        </span>
                    </td>

                    <td>

                        <button
                            class="primary-btn"
                            onclick="abrirChamado(${chamado.id})"
                        >
                            Abrir
                        </button>

                    </td>

                </tr>
            `;
        });

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   CRIAR CHAMADO
========================= */

const chamadoForm =
    document.getElementById(
        'chamado-form'
    );

if (chamadoForm) {

    chamadoForm.addEventListener(
        'submit',
        async (e) => {

            e.preventDefault();

            const categoria =
                document.getElementById(
                    'categoria'
                ).value;

            const tipoProblema =
                document.getElementById(
                    'tipo-problema'
                ).value;

            const titulo =
                document.getElementById(
                    'titulo'
                ).value;

            const descricao =
                document.getElementById(
                    'descricao'
                ).value;

            const prioridade =
                document.getElementById(
                    'prioridade'
                )?.value || 'Média';

            try {

                const resposta =
                    await fetch(
                        `${API}/chamados`,
                        {

                            method: 'POST',

                            headers:
                                getHeaders(),

                            body: JSON.stringify({

                                usuario:
                                    usuarioLogado.usuario,

                                categoria,

                                tipoProblema,

                                titulo,

                                descricao,

                                prioridade
                            })
                        }
                    );

                const dados =
                    await resposta.json();

                alert(
                    dados.mensagem
                );

                socket.emit(
                    'novaNotificacao',
                    {
                        mensagem:
                            `Novo chamado criado por ${usuarioLogado.usuario}`
                    }
                );

                chamadoForm.reset();

                carregarMeusChamados();

                if (
                    usuarioLogado.tipo ===
                    'superadmin'
                ) {

                    carregarChamadosAdmin();
                }

            } catch (erro) {

                console.error(erro);
            }
        }
    );
}

/* =========================
   CHAMADOS ADMIN
========================= */

async function carregarChamadosAdmin() {

    if (
        usuarioLogado?.tipo !==
        'superadmin'
    ) return;

    const tabela =
        document.getElementById(
            'lista-chamados'
        );

    if (!tabela) return;

    try {

        const resposta =
            await fetch(
                `${API}/chamados`,
                {
                    headers:
                        getHeaders(false)
                }
            );

        let chamados =
            await resposta.json();

        chamados =
            filtrarChamados(
                chamados
            );

        tabela.innerHTML = '';

        chamados.forEach((c) => {

            tabela.innerHTML += `
                <tr>

                    <td>${c.id}</td>

                    <td>${c.usuario}</td>

                    <td>${c.categoria}</td>

                    <td>${c.tipoProblema}</td>

                    <td>${c.titulo}</td>

                    <td>

                        <select
                            class="status-select"
                            onchange="
                                alterarStatus(
                                    ${c.id},
                                    this.value
                                )
                            "
                        >

                            <option
                                value="Novo"
                                ${c.status === 'Novo'
                                    ? 'selected'
                                    : ''}
                            >
                                Novo
                            </option>

                            <option
                                value="Em andamento"
                                ${c.status === 'Em andamento'
                                    ? 'selected'
                                    : ''}
                            >
                                Em andamento
                            </option>

                            <option
                                value="Pendente"
                                ${c.status === 'Pendente'
                                    ? 'selected'
                                    : ''}
                            >
                                Pendente
                            </option>

                            <option
                                value="Fechado"
                                ${c.status === 'Fechado'
                                    ? 'selected'
                                    : ''}
                            >
                                Fechado
                            </option>

                        </select>

                    </td>

                    <td>

                        <select
                            class="status-select prioridade-select"
                            onchange="
                                alterarPrioridade(
                                    ${c.id},
                                    this.value
                                )
                            "
                        >

                            <option
                                value="Baixa"
                                ${c.prioridade === 'Baixa'
                                    ? 'selected'
                                    : ''}
                            >
                                Baixa
                            </option>

                            <option
                                value="Média"
                                ${
                                    c.prioridade === 'Média' ||
                                    !c.prioridade
                                        ? 'selected'
                                        : ''
                                }
                            >
                                Média
                            </option>

                            <option
                                value="Alta"
                                ${c.prioridade === 'Alta'
                                    ? 'selected'
                                    : ''}
                            >
                                Alta
                            </option>

                        </select>

                    </td>

                    <td>

                        <button
                            class="primary-btn"
                            onclick="
                                abrirChamado(${c.id})
                            "
                        >
                            Abrir
                        </button>

                    </td>

                </tr>
            `;
        });

    } catch (erro) {

        console.error(erro);
    }
}
/* =========================
   ALTERAR PRIORIDADE
========================= */

async function alterarPrioridade(
    id,
    prioridade
) {

    try {

        const resposta =
            await fetch(
                `${API}/chamados/${id}/prioridade`,
                {

                    method: 'PUT',

                    headers:
                        getHeaders(),

                    body: JSON.stringify({
                        prioridade
                    })
                }
            );

        const dados =
            await resposta.json();

        if (!dados.sucesso) {

            alert(
                dados.mensagem
            );

            return;
        }

        mostrarToast(
            `Prioridade alterada para ${prioridade}`
        );

        carregarChamadosAdmin();

        carregarMeusChamados();

    } catch (erro) {

        console.error(erro);
    }
}

window.alterarPrioridade =
    alterarPrioridade;

/* =========================
   CHAT CHAMADO
========================= */

async function abrirChamado(id) {

    window.chamadoAbertoId =
        id;

    const modal =
        document.getElementById(
            'modal-chamado'
        );

    const bodyModal =
        document.getElementById(
            'modal-body'
        );

    modal.style.display = 'flex';

    try {

        const respostaChamados =
            await fetch(
                `${API}/chamados`,
                {
                    headers:
                        getHeaders(false)
                }
            );

        const respostaMensagens =
            await fetch(
                `${API}/mensagens/${id}`,
                {
                    headers:
                        getHeaders(false)
                }
            );

        const chamados =
            await respostaChamados.json();

        const mensagens =
            await respostaMensagens.json();

        const chamado =
            chamados.find(
                c => c.id == id
            );

        bodyModal.innerHTML = `

            <div class="ticket-top">

                <div>

                    <h2>
                        #${chamado.id}
                        - ${chamado.titulo}
                    </h2>

                    <p>
                        ${chamado.descricao}
                    </p>

                </div>

            </div>

            <div
                class="chat-messages"
                id="chat-messages"
            >

                ${
                    mensagens.map((m) => `

                        <div class="
                            mensagem-item
                            ${
                                m.usuario === usuarioLogado.usuario
                                ? 'minha-mensagem'
                                : 'outra-mensagem'
                            }
                        ">

                            <strong>
                                ${m.usuario}
                            </strong>

                            <p>
                                ${m.mensagem}
                            </p>

                            ${
                                m.arquivo
                                ? `
                                    <a
                                        href="${API}/uploads/${m.arquivo}"
                                        target="_blank"
                                    >
                                        📎 ${m.arquivo}
                                    </a>
                                `
                                : ''
                            }

                        </div>

                    `).join('')
                }

            </div>

            <textarea
                id="nova-mensagem"
                placeholder="Digite uma mensagem..."
            ></textarea>

            <br><br>

            <input
                type="file"
                id="arquivo-chat"
            >

            <br><br>

            <button
                class="primary-btn"
                onclick="enviarMensagem(${id})"
            >
                Enviar
            </button>
        `;

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   FECHAR MODAL
========================= */

function fecharModalChamado() {

    document.getElementById(
        'modal-chamado'
    ).style.display =
        'none';
}

/* =========================
   ENVIAR MENSAGEM
========================= */

async function enviarMensagem(id) {

    const campo =
        document.getElementById(
            'nova-mensagem'
        );

    const mensagem =
        campo.value.trim();

    const arquivoInput =
        document.getElementById(
            'arquivo-chat'
        );

    let arquivo = null;

    if (
        arquivoInput &&
        arquivoInput.files.length > 0
    ) {

        const formData =
            new FormData();

        formData.append(
            'arquivo',
            arquivoInput.files[0]
        );

        const upload =
            await fetch(
                `${API}/upload`,
                {

                    method: 'POST',

                    headers: {

                        Authorization:
                            `Bearer ${getToken()}`
                    },

                    body: formData
                }
            );

        const uploadDados =
            await upload.json();

        arquivo =
            uploadDados.arquivo;
    }

    if (
        !mensagem &&
        !arquivo
    ) {

        return;
    }

    try {

        const resposta =
            await fetch(
                `${API}/mensagens`,
                {

                    method: 'POST',

                    headers:
                        getHeaders(),

                    body: JSON.stringify({

                        chamado_id: id,

                        usuario:
                            usuarioLogado.usuario,

                        mensagem,

                        arquivo
                    })
                }
            );

        const dados =
            await resposta.json();

        if (!dados.sucesso) {

            alert(
                dados.mensagem
            );

            return;
        }

        socket.emit(
            'novaMensagem',
            {
                chamado_id: id
            }
        );

        socket.emit(
            'novaNotificacao',
            {
                mensagem:
                    `Nova mensagem em chamado #${id}`
            }
        );

        abrirChamado(id);

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   FEED DE ATIVIDADES
========================= */

async function carregarAtividades() {

    const container =
        document.getElementById(
            'feed-atividades'
        );

    if (!container) return;

    try {

        const resposta =
            await fetch(
                `${API}/atividades`,
                {
                    headers:
                        getHeaders(false)
                }
            );

        const atividades =
            await resposta.json();

        container.innerHTML = '';

        atividades.forEach((a) => {

            container.innerHTML += `

                <div class="atividade-item">

                    <strong>
                        ${a.usuario}
                    </strong>

                    <p>
                        ${a.acao}
                    </p>

                    <small>
                        ${new Date(a.data)
                            .toLocaleString()}
                    </small>

                </div>
            `;
        });

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   DASHBOARD ADMIN
========================= */

async function carregarDashboardAdmin() {

    if (
        usuarioLogado?.tipo !==
        'superadmin'
    ) return;

    try {

        const resposta =
            await fetch(
                `${API}/dashboard`,
                {
                    headers:
                        getHeaders(false)
                }
            );

        const dados =
            await resposta.json();

        document.getElementById(
            'stat-total-chamados'
        ).textContent =
            dados.chamados;

        document.getElementById(
            'stat-total-usuarios'
        ).textContent =
            dados.usuarios;

        document.getElementById(
            'stat-abertos'
        ).textContent =
            dados.abertos;

        document.getElementById(
            'stat-fechados'
        ).textContent =
            dados.fechados;

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   ALTERAR STATUS
========================= */

async function alterarStatus(id, status) {

    try {

        const resposta =
            await fetch(
                `${API}/chamados/${id}/status`,
                {

                    method: 'PUT',

                    headers:
                        getHeaders(),

                    body: JSON.stringify({
                        status
                    })
                }
            );

        const dados =
            await resposta.json();

        alert(
            dados.mensagem
        );

        socket.emit(
            'novaNotificacao',
            {
                mensagem:
                    `Chamado #${id} atualizado para ${status}`
            }
        );

        carregarChamadosAdmin();

        carregarMeusChamados();

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   USUÁRIOS
========================= */

async function carregarUsuarios() {

    const tabela =
        document.getElementById(
            'lista-usuarios'
        );

    if (!tabela) return;

    try {

        const resposta =
            await fetch(
                `${API}/usuarios`,
                {

                    headers:
                        getHeaders(false)
                }
            );

        const usuarios =
            await resposta.json();

        tabela.innerHTML = '';

        usuarios.forEach((usuario) => {

            tabela.innerHTML += `
                <tr>

                    <td>${usuario.usuario}</td>

                    <td>${usuario.tipo}</td>

                    <td>

                        ${
                            usuario.usuario !== 'TI'
                            ? `
                                <button
                                    class="danger-btn"
                                    onclick="deletarUsuario(${usuario.id})"
                                >
                                    Excluir
                                </button>
                            `
                            : 'Super Admin'
                        }

                    </td>

                </tr>
            `;
        });

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   EXCLUIR USUÁRIO
========================= */

async function deletarUsuario(id) {

    const confirmar =
        confirm(
            'Deseja excluir?'
        );

    if (!confirmar) return;

    try {

        const resposta =
            await fetch(
                `${API}/usuarios/${id}`,
                {

                    method: 'DELETE',

                    headers:
                        getHeaders(false)
                }
            );

        const dados =
            await resposta.json();

        alert(
            dados.mensagem
        );

        carregarUsuarios();

    } catch (erro) {

        console.error(erro);
    }
}

/* =========================
   CRIAR USUÁRIO
========================= */

const btnCriarUsuario =
    document.getElementById(
        'btn-criar-usuario'
    );

if (btnCriarUsuario) {

    btnCriarUsuario.addEventListener(
        'click',
        async () => {

            const usuario =
                document.getElementById(
                    'novo-usuario'
                ).value;

            const senha =
                document.getElementById(
                    'nova-senha'
                ).value;

            const tipo =
                document.getElementById(
                    'tipo-usuario'
                ).value;

            try {

                const resposta =
                    await fetch(
                        `${API}/usuarios`,
                        {

                            method: 'POST',

                            headers:
                                getHeaders(),

                            body: JSON.stringify({

                                usuario,
                                senha,
                                tipo
                            })
                        }
                    );

                const dados =
                    await resposta.json();

                alert(
                    dados.mensagem
                );

                carregarUsuarios();

            } catch (erro) {

                console.error(erro);
            }
        }
    );
}

/* =========================
   GLOBAL
========================= */

window.logout = logout;

window.toggleTheme =
    toggleTheme;

window.mostrarPainel =
    mostrarPainel;

window.deletarUsuario =
    deletarUsuario;

window.abrirChamado =
    abrirChamado;

window.fecharModalChamado =
    fecharModalChamado;

window.enviarMensagem =
    enviarMensagem;

window.alterarStatus =
    alterarStatus;

window.filtrarChamados =
    filtrarChamados;

window.carregarMeusChamados =
    carregarMeusChamados;

window.carregarChamadosAdmin =
    carregarChamadosAdmin;

    /* =========================
   TIPOS DE PROBLEMA
========================= */

const tiposProblema = {

    'Suporte técnico': [

        'Computador lento',

        'Erro no Windows',

        'Problema com monitor',

        'Teclado ou mouse',

        'Instalação de programas'
    ],

    'Emails e contas': [

        'Senha esquecida',

        'Email não envia',

        'Email não recebe',

        'Bloqueio de conta'
    ],

    'Rede e internet': [

        'Sem internet',

        'Internet lenta',

        'Wi-Fi',

        'Rede interna'
    ],

    'Sistemas': [

        'Erro no sistema',

        'Sistema travando',

        'Acesso negado',

        'Cadastro'
    ],

    'Telefonia': [

        'Ramal',

        'Ligação',

        'Telefone sem sinal'
    ],

    'Solicitações': [

        'Novo usuário',

        'Novo equipamento',

        'Permissão de acesso'
    ],

    'Outros': [

        'Outros'
    ]
};

const categoriaSelect =
    document.getElementById(
        'categoria'
    );

const tipoProblemaSelect =
    document.getElementById(
        'tipo-problema'
    );

function atualizarTiposProblema() {

    if (
        !categoriaSelect ||
        !tipoProblemaSelect
    ) {

        return;
    }

    const categoria =
        categoriaSelect.value;

    tipoProblemaSelect.innerHTML =
        '';

    if (
        !tiposProblema[categoria]
    ) {

        tipoProblemaSelect.innerHTML =
            `
                <option value="">
                    Selecione primeiro
                </option>
            `;

        return;
    }

    tiposProblema[categoria]
        .forEach((tipo) => {

            tipoProblemaSelect.innerHTML += `
                <option value="${tipo}">
                    ${tipo}
                </option>
            `;
        });
}

if (categoriaSelect) {

    categoriaSelect.addEventListener(
        'change',
        atualizarTiposProblema
    );

    atualizarTiposProblema();
}

/* =========================
   ALTERAR PRIORIDADE
========================= */

async function alterarPrioridade(
    id,
    prioridade
) {

    try {

        const resposta =
            await fetch(
                `${API}/chamados/${id}/prioridade`,
                {

                    method: 'PUT',

                    headers:
                        getHeaders(),

                    body: JSON.stringify({
                        prioridade
                    })
                }
            );

        const dados =
            await resposta.json();

        if (!dados.sucesso) {

            alert(
                dados.mensagem ||
                'Erro ao alterar prioridade'
            );

            return;
        }

        mostrarToast(
            'Prioridade atualizada'
        );

        carregarChamadosAdmin();

        carregarMeusChamados();

    } catch (erro) {

        console.error(erro);
    }
}

window.alterarPrioridade =
    alterarPrioridade;