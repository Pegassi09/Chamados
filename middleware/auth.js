const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {

    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    'Token não informado'
            });
        }

        const partes =
            authHeader.split(' ');

        if (
            partes.length !== 2
        ) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    'Token inválido'
            });
        }

        const [
            bearer,
            token
        ] = partes;

        if (bearer !== 'Bearer') {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    'Formato inválido'
            });
        }

        if (!token) {

            return res.status(401).json({

                sucesso: false,

                mensagem:
                    'Token ausente'
            });
        }

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.usuario = {

            id:
                decoded.id,

            usuario:
                decoded.usuario,

            tipo:
                decoded.tipo
        };

        next();

    } catch (erro) {

        console.error(
            'Erro auth:',
            erro.message
        );

        return res.status(401).json({

            sucesso: false,

            mensagem:
                'Token inválido ou expirado'
        });
    }
};