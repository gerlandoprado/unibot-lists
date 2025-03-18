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
            headless: false,
            catchQR: (base64Qr, asciiQR) => {
                console.log('QR Code gerado! Escaneie para conectar.');
            },
            statusFind: (statusSession, session) => {
                console.log('Status da Sessão:', statusSession);
            },
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
                    
                    // Verificar se a mensagem citada tem um ID válido
                    if (!message.quotedMsgId) {
                        console.log('ID da mensagem citada não encontrado');
                        return;
                    }

                    const quotedMessageId = message.quotedMsgId;
                    const listKey = `${message.chatId}_${quotedMessageId}`;
                    const activeList = activeLists.get(listKey);

                    if (activeList) {
                        console.log('Gerando lista formatada...');
                        let listaFormatada = 'Lista de Participantes:\n\n';
                        let contador = 1;

                        for (const participant of activeList.participants) {
                            const phone = participant.split('@')[0];
                            const nome = await database.getUserByPhone(phone) || 'Nome não encontrado';
                            listaFormatada += `${contador}. ${nome}\n`;
                            contador++;
                        }

                        // Enviar lista em mensagem privada
                        await client.sendText(message.author, listaFormatada);
                        
                        // Remover lista após geração
                        activeLists.delete(listKey);
                    } else {
                        console.log('Lista não encontrada para a mensagem citada');
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