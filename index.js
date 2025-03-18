const wppconnect = require('@wppconnect-team/wppconnect');
const config = require('./config');
const database = require('./database');

// Armazenar as listas ativas
const activeLists = new Map();

async function start() {
    try {
        await database.connect();

        const client = await wppconnect.create({
            session: 'bot-listas',
            catchQR: (base64Qr, asciiQR) => {
                console.log('QR Code gerado! Escaneie para conectar.');
            },
            statusFind: (statusSession, session) => {
                console.log('Status da Sessão:', statusSession);
            },
            puppeteerOptions: {
                headless: true,
                timeout: 60000,
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-cache',
                    '--disable-application-cache',
                    '--disable-offline-load-stale-cache',
                    '--disk-cache-size=0',
                    '--disable-translate',
                    '--aggressive-cache-discard'
                ]
            }
        });

        client.onMessage(async (message) => {
            try {
                // Ignorar mensagens sem corpo
                if (!message.body) {
                    return;
                }

                // Verificar se é uma mensagem de abertura de lista
                if (config.openListRegex.test(message.body) && message.isGroupMsg) {
                    const listKey = `${message.chatId}_${message.id}`;
                    activeLists.set(listKey, {
                        participants: new Set(),
                        messageId: message.id,
                        groupId: message.chatId,
                        startTime: new Date()
                    });
                    console.log(`Nova lista criada: ${listKey}`);
                    return;
                }

                // Verificar se é uma mensagem "add"
                if (message.body.toLowerCase() === config.keywords.add && message.isGroupMsg) {
                    // Encontrar lista ativa no grupo
                    const groupLists = Array.from(activeLists.entries())
                        .filter(([key, list]) => list.groupId === message.chatId);

                    console.log(message);
                    
                    if (groupLists.length > 0) {
                        const [listKey, activeList] = groupLists[groupLists.length - 1];
                        activeList.participants.add(message.author.split('@')[0]);
                        console.log(`Usuário ${message.author} adicionado à lista ${listKey}`);
                    }
                    return;
                }

                // Verificar se é um comando para gerar lista
                if (message.body.toLowerCase() === config.keywords.generateList && 
                    message.quotedMsg) {
                    console.log('Gerando lista...');
                    console.log('Mensagem citada:', message.quotedMsgId);

                    try {
                        // Buscar todas as mensagens do grupo após a mensagem citada
                        const messages = await client.getMessages(
                            message.chatId, 
                            {
                                count: 150,
                                id: message.quotedMsgId,
                                direction: 'after',
                            }
                        );

                        console.log(`Encontradas ${messages.length} mensagens após a mensagem citada`);

                        // Filtrar apenas mensagens com "add" exato
                        const participants = new Set();
                        const participantInfo = new Map(); // Armazenar informações adicionais por participante

                        messages.forEach(msg => {
                            // Verificar se a mensagem começa com "add"
                            if (msg.body && msg.body.toLowerCase().startsWith('add')) {
                                // Extrair o texto adicional (se houver)
                                const additionalText = msg.body.trim().substring(3).trim();
                                
                                // Armazenar o usuário, seu texto adicional e nome formatado
                                participants.add(msg.author);
                                participantInfo.set(msg.author, {
                                    text: additionalText,
                                    name: msg.notifyName
                                });
                                //console.log(msg);
                            }
                        });

                        console.log(`Encontrados ${participants.size} participantes`);

                        if (participants.size > 0) {
                            let listaFormatada = 'Lista de Participantes:\n\n';
                            let contador = 1;

                            for (const participant of participants) {
                                const phone = participant.split('@')[0];
                                const info = participantInfo.get(participant);
                                const userInfo = await database.getUserByPhone(phone);
                                
                                // Formatar a linha da lista
                                let linha = `${contador}. `;
                                
                                if (userInfo) {
                                    linha += `${userInfo} `;
                                } else {
                                    // Usar formattedName se disponível, senão usar pushname ou número
                                    const displayName = info.name || phone;
                                    linha += `${displayName} `;
                                }
                                
                                // Adicionar o texto adicional se houver
                                if (info.text) {
                                    linha += `[${info.text}]`;
                                }
                                
                                listaFormatada += linha + '\n';
                                contador++;
                            }

                            // Enviar lista em mensagem privada
                            await client.sendText(message.author, listaFormatada);
                        } else {
                            await client.sendText(message.author, 'Nenhum participante encontrado após a mensagem.');
                        }
                    } catch (error) {
                        console.error('Erro ao buscar mensagens:', error);
                        await client.sendText(message.author, 'Erro ao gerar a lista. Por favor, tente novamente.');
                    }
                }
            } catch (error) {
                console.error('Erro ao processar mensagem:', error);
            }
        });

    } catch (error) {
        console.error('Erro ao iniciar o bot:', error);
    }
}

start(); 