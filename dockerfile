# Use a imagem mais recente do Node.js como base
FROM node

# Define a variável de ambiente TZ com o fuso horário de São Paulo
ENV TZ=America/Sao_Paulo

# Instalação do Chromium
RUN apt-get update \
    && apt-get install -y chromium

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie os arquivos package*.json para o diretório de trabalho
COPY package*.json ./

# Instale as dependências
RUN npm install

# Copie o arquivo autogroups.js para o diretório de trabalho
# COPY main.js ./
# COPY src ./src

# Cria um ponto de montagem de volume
# VOLUME /app

# Define o nome padrão do contêiner
ENV CONTAINER_NAME=node-lists

# Comando padrão a ser executado quando o contêiner for iniciado
CMD ["node", "main.js"]