require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const http = require('http');
const { Server } = require('socket.io');

const auth = require('./middleware/auth');
const permissions = require('./middleware/permissions');

const app = express();

const server = http.createServer(app);

const io = new Server(server, {

    cors: {

        origin: '*',

        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

/* =========================
   DATABASE
========================= */

if (!fs.existsSync('./database')) {

    fs.mkdirSync('./database');
}

const db = new Database('./database/database.sqlite');

const initSQL = fs.readFileSync(
    './database/init.sql',
    'utf8'
);

db.exec(initSQL);

/* =========================
   UPLOADS
========================= */

if (!fs.existsSync('./uploads')) {

    fs.mkdirSync('./uploads');
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, './uploads');
    },

    filename: (req, file, cb) => {

        const nome =
            Date.now() +
            '-' +
            file.originalname;

        cb(null, nome);
    }
});

const upload = multer({
    storage
});

app.use(
    '/uploads',
    express.static(
        path.join(
            __dirname,
            'uploads'
        )
    )
);

/* =========================
   SOCKET.IO
========================= */

io.on('connection', (socket) => {

    console.log(
        'Usuário conectado:',
        socket.id
    );

    socket.on(
        'novaMensagem',
        (dados) => {

            io.emit(
                'mensagemRecebida',
                dados
            );
        }
    );

    socket.on(
        'novaNotificacao',
        (dados) => {

            io.emit(
                'notificacao',
                dados
            );
        }
    );

    socket.on(
        'disconnect',
        () => {

            console.log(
                'Usuário desconectado:',
                socket.id
            );
        }
    );
});

/* =========================
   TABELAS
========================= */

db.exec(`
    CREATE TABLE IF NOT EXISTS mensagens (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        chamado_id INTEGER NOT NULL,

        usuario TEXT NOT NULL,

        mensagem TEXT NOT NULL,

        arquivo TEXT,

        data_envio DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
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
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        usuario TEXT UNIQUE NOT NULL,

        senha TEXT NOT NULL,

        tipo TEXT NOT NULL
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS historico (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        chamado_id INTEGER,

        usuario TEXT,

        acao TEXT,

        data DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

/* =========================
   MIDDLEWARES
========================= */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static(
    path.join(__dirname, 'public')
));

app.use(helmet());

const limiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    max: 10,

    message: 'Muitas tentativas.'
});

app.use('/login', limiter);

/* =========================
   SUPER ADMIN
========================= */

const adminExiste = db
    .prepare(`
        SELECT *
        FROM usuarios
        WHERE usuario = ?
    `)
    .get('TI');

if (!adminExiste) {

    const senhaHash =
        bcrypt.hashSync(
            'Ch4m4D0$',
            10
        );

    db.prepare(`
        INSERT INTO usuarios (
            usuario,
            senha,
            tipo
        )
        VALUES (?, ?, ?)
    `).run(
        'TI',
        senhaHash,
        'superadmin'
    );

    console.log(
        'Super admin criado'
    );
}

/* =========================
   LOGIN
========================= */

app.post('/login', async (req, res) => {

    try {

        const {
            usuario,
            senha
        } = req.body;

        if (
            !usuario ||
            !senha
        ) {

            return res.status(400).json({

                sucesso: false,

                mensagem:
                    'Preencha usuário e senha'
            });
        }

        const user = db
            .prepare(`
                SELECT *
                FROM usuarios
                WHERE usuario = ?
            `)
            .get(usuario);

        if (!user) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    'Usuário inválido'
            });
        }

        const senhaValida =
            await bcrypt.compare(
                senha,
                user.senha
            );

        if (!senhaValida) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    'Senha inválida'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                usuario: user.usuario,
                tipo: user.tipo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        res.json({

            sucesso: true,

            token,

            usuario: {

                id:
                    user.id,

                usuario:
                    user.usuario,

                tipo:
                    user.tipo
            }
        });

    } catch (erro) {

        console.error(erro);

        res.status(500).json({

            sucesso: false,

            mensagem:
                'Erro interno'
        });
    }
});

/* =========================
   VALIDAR TOKEN
========================= */

app.get(
    '/validar-token',
    auth,
    (req, res) => {

        res.json({

            sucesso: true,

            usuario: {

                id:
                    req.usuario.id,

                usuario:
                    req.usuario.usuario,

                tipo:
                    req.usuario.tipo
            }
        });
    }
);

/* =========================
   DASHBOARD ADMIN
========================= */

app.get(
    '/dashboard',
    auth,
    permissions('superadmin'),
    (req, res) => {

        try {

            const chamados =
                db.prepare(`
                    SELECT COUNT(*) total
                    FROM chamados
                `).get();

            const usuarios =
                db.prepare(`
                    SELECT COUNT(*) total
                    FROM usuarios
                `).get();

            const abertos =
                db.prepare(`
                    SELECT COUNT(*) total
                    FROM chamados
                    WHERE status != 'Fechado'
                `).get();

            const fechados =
                db.prepare(`
                    SELECT COUNT(*) total
                    FROM chamados
                    WHERE status = 'Fechado'
                `).get();

            res.json({

                chamados:
                    chamados.total,

                usuarios:
                    usuarios.total,

                abertos:
                    abertos.total,

                fechados:
                    fechados.total
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   LISTAR USUÁRIOS
========================= */

app.get(
    '/usuarios',
    auth,
    permissions('superadmin'),
    (req, res) => {

        try {

            const usuarios = db
                .prepare(`
                    SELECT
                        id,
                        usuario,
                        tipo
                    FROM usuarios
                    ORDER BY id DESC
                `)
                .all();

            res.json(usuarios);

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   CRIAR USUÁRIO
========================= */

app.post(
    '/usuarios',
    auth,
    permissions('superadmin'),
    async (req, res) => {

        try {

            const {
                usuario,
                senha,
                tipo
            } = req.body;

            const usuarioExiste = db
                .prepare(`
                    SELECT *
                    FROM usuarios
                    WHERE usuario = ?
                `)
                .get(usuario);

            if (usuarioExiste) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        'Usuário já existe'
                });
            }

            const senhaHash =
                await bcrypt.hash(
                    senha,
                    10
                );

            db.prepare(`
                INSERT INTO usuarios (
                    usuario,
                    senha,
                    tipo
                )
                VALUES (?, ?, ?)
            `).run(
                usuario,
                senhaHash,
                tipo
            );

            io.emit(
                'notificacao',
                {
                    mensagem:
                        `Novo usuário criado: ${usuario}`
                }
            );

            res.json({

                sucesso: true,

                mensagem:
                    'Usuário criado'
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   EXCLUIR USUÁRIO
========================= */

app.delete(
    '/usuarios/:id',
    auth,
    permissions('superadmin'),
    (req, res) => {

        try {

            const usuario = db
                .prepare(`
                    SELECT *
                    FROM usuarios
                    WHERE id = ?
                `)
                .get(req.params.id);

            if (
                usuario.usuario === 'TI'
            ) {

                return res.status(403).json({

                    sucesso: false,

                    mensagem:
                        'Não permitido'
                });
            }

            db.prepare(`
                DELETE FROM usuarios
                WHERE id = ?
            `).run(req.params.id);

            res.json({

                sucesso: true,

                mensagem:
                    'Usuário excluído'
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   UPLOAD
========================= */

app.post(
    '/upload',
    auth,
    upload.single('arquivo'),
    (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem:
                        'Nenhum arquivo enviado'
                });
            }

            res.json({

                sucesso: true,

                arquivo:
                    req.file.filename
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   CRIAR CHAMADO
========================= */

app.post(
    '/chamados',
    auth,
    upload.single('anexo'),
    (req, res) => {

        try {

            const usuario =
                req.usuario.usuario;

            const {
                categoria,
                tipoProblema,
                titulo,
                descricao,
                prioridade
            } = req.body;

            const anexo =
                req.file
                    ? req.file.filename
                    : null;

            db.prepare(`
                INSERT INTO chamados (
                    usuario,
                    categoria,
                    tipoProblema,
                    titulo,
                    descricao,
                    status,
                    prioridade,
                    anexo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                usuario,
                categoria,
                tipoProblema,
                titulo,
                descricao,
                'Novo',
                prioridade || 'Média',
                anexo
            );

            const chamado =
                db.prepare(`
                    SELECT last_insert_rowid() id
                `).get();

            db.prepare(`
                INSERT INTO historico (
                    chamado_id,
                    usuario,
                    acao
                )
                VALUES (?, ?, ?)
            `).run(
                chamado.id,
                usuario,
                'Chamado criado'
            );

            io.emit(
                'notificacao',
                {
                    mensagem:
                        `Novo chamado criado por ${usuario}`
                }
            );

            res.json({

                sucesso: true,

                mensagem:
                    'Chamado criado'
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   LISTAR CHAMADOS
========================= */

app.get(
    '/chamados',
    auth,
    (req, res) => {

        try {

            const busca =
                req.query.busca || '';

            const status =
                req.query.status || '';

            const prioridade =
                req.query.prioridade || '';

            let sql = `
                SELECT *
                FROM chamados
                WHERE 1=1
            `;

            const params = [];

            if (busca) {

                sql += `
                    AND (
                        titulo LIKE ?
                        OR usuario LIKE ?
                    )
                `;

                params.push(
                    `%${busca}%`,
                    `%${busca}%`
                );
            }

            if (status) {

                sql += `
                    AND status = ?
                `;

                params.push(status);
            }

            if (prioridade) {

                sql += `
                    AND prioridade = ?
                `;

                params.push(prioridade);
            }

            sql += `
                ORDER BY id DESC
            `;

            const chamados =
                db.prepare(sql).all(...params);

            res.json(chamados);

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   ALTERAR STATUS
========================= */

app.put(
    '/chamados/:id/prioridade',
    auth,
    permissions('superadmin'),
    (req, res) => {

        try {

            const {
                prioridade
            } = req.body;

            db.prepare(`
                UPDATE chamados
                SET prioridade = ?
                WHERE id = ?
            `).run(
                prioridade,
                req.params.id
            );

            db.prepare(`
                INSERT INTO historico (
                    chamado_id,
                    usuario,
                    acao
                )
                VALUES (?, ?, ?)
            `).run(
                req.params.id,
                req.usuario.usuario,
                `Prioridade alterada para ${prioridade}`
            );

            io.emit(
                'notificacao',
                {
                    mensagem:
                        `Chamado #${req.params.id} prioridade alterada para ${prioridade}`
                }
            );

            res.json({

                sucesso: true,

                mensagem:
                    'Prioridade atualizada'
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

app.put(
    '/chamados/:id/status',
    auth,
    permissions('superadmin'),
    (req, res) => {

        try {

            const {
                status
            } = req.body;

            db.prepare(`
                UPDATE chamados
                SET status = ?
                WHERE id = ?
            `).run(
                status,
                req.params.id
            );

            db.prepare(`
                INSERT INTO historico (
                    chamado_id,
                    usuario,
                    acao
                )
                VALUES (?, ?, ?)
            `).run(
                req.params.id,
                req.usuario.usuario,
                `Status alterado para ${status}`
            );

            io.emit(
                'notificacao',
                {
                    mensagem:
                        `Chamado #${req.params.id} atualizado para ${status}`
                }
            );

            res.json({

                sucesso: true,

                mensagem:
                    'Status atualizado'
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   HISTÓRICO
========================= */

app.get(
    '/historico/:id',
    auth,
    (req, res) => {

        try {

            const historico =
                db.prepare(`
                    SELECT *
                    FROM historico
                    WHERE chamado_id = ?
                    ORDER BY id DESC
                `).all(req.params.id);

            res.json(historico);

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   FEED DE ATIVIDADES
========================= */

app.get(
    '/atividades',
    auth,
    permissions('superadmin'),
    (req, res) => {

        try {

            const atividades =
                db.prepare(`
                    SELECT *
                    FROM historico
                    ORDER BY id DESC
                    LIMIT 50
                `).all();

            res.json(atividades);

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   LISTAR MENSAGENS
========================= */

app.get(
    '/mensagens/:id',
    auth,
    (req, res) => {

        try {

            const mensagens = db
                .prepare(`
                    SELECT *
                    FROM mensagens
                    WHERE chamado_id = ?
                    ORDER BY id ASC
                `)
                .all(req.params.id);

            res.json(mensagens);

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   ENVIAR MENSAGEM
========================= */

app.post(
    '/mensagens',
    auth,
    upload.single('arquivo'),
    (req, res) => {

        try {

            const usuario =
                req.usuario.usuario;

            const {
                chamado_id,
                mensagem
            } = req.body;

            const arquivo =
                req.file
                    ? req.file.filename
                    : null;

            db.prepare(`
                INSERT INTO mensagens (
                    chamado_id,
                    usuario,
                    mensagem,
                    arquivo
                )
                VALUES (?, ?, ?, ?)
            `).run(
                chamado_id,
                usuario,
                mensagem || '',
                arquivo
            );

            const novaMensagem = {

                chamado_id,

                usuario,

                mensagem,

                arquivo,

                data_envio:
                    new Date()
            };

            io.emit(
                'mensagemRecebida',
                novaMensagem
            );

            io.emit(
                'notificacao',
                {
                    mensagem:
                        `Nova mensagem de ${usuario}`
                }
            );

            db.prepare(`
                INSERT INTO historico (
                    chamado_id,
                    usuario,
                    acao
                )
                VALUES (?, ?, ?)
            `).run(
                chamado_id,
                usuario,
                'Mensagem enviada'
            );

            res.json({

                sucesso: true,

                mensagem:
                    'Mensagem enviada'
            });

        } catch (erro) {

            console.error(erro);

            res.status(500).json({

                sucesso: false
            });
        }
    }
);

/* =========================
   INDEX
========================= */

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'public',
            'index.html'
        )
    );
});

/* =========================
   SERVER
========================= */

server.listen(PORT, () => {

    console.log(`
====================================

Servidor iniciado:

http://localhost:${PORT}

Login padrão:
Usuário: TI
Senha: Ch4m4D0$

====================================
    `);
});