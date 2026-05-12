CREATE TABLE IF NOT EXISTS usuarios (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    usuario TEXT NOT NULL UNIQUE,

    senha TEXT NOT NULL,

    categoria TEXT,

    tipo TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chamados (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    usuario TEXT NOT NULL,

    categoria TEXT NOT NULL,

    tipoProblema TEXT NOT NULL,

    titulo TEXT NOT NULL,

    descricao TEXT NOT NULL,

    status TEXT NOT NULL,

    prioridade TEXT DEFAULT 'Média',

    anexo TEXT,

    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mensagens (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    chamado_id INTEGER NOT NULL,

    usuario TEXT NOT NULL,

    mensagem TEXT NOT NULL,

    arquivo TEXT,

    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historico (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    chamado_id INTEGER,

    usuario TEXT,

    acao TEXT,

    data DATETIME DEFAULT CURRENT_TIMESTAMP
);