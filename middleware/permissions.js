module.exports = (...tiposPermitidos) => {

    return (req, res, next) => {

        try {

            if (!req.usuario) {

                return res.status(401).json({

                    sucesso: false,

                    mensagem:
                        'Usuário não autenticado'
                });
            }

            if (
                !tiposPermitidos.includes(
                    req.usuario.tipo
                )
            ) {

                return res.status(403).json({

                    sucesso: false,

                    mensagem:
                        'Acesso negado'
                });
            }

            next();

        } catch (erro) {

            console.error(
                'Erro permissions:',
                erro
            );

            return res.status(500).json({

                sucesso: false,

                mensagem:
                    'Erro interno de permissão'
            });
        }
    };
};