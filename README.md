# Autedit

Aplicativo desktop construído com Electron, React e TypeScript para automatizar um fluxo de edição de vídeo com apoio de IA.

## O que o projeto faz

O aplicativo recebe um arquivo de vídeo em formato `.mp4` e executa automaticamente o fluxo abaixo:

1. Cria a pasta `VIDEOS_EDITADOS` no Desktop do dispositivo.
2. Cria uma subpasta com o mesmo nome do vídeo selecionado.
3. Extrai o áudio do vídeo e gera um arquivo `.mp3`.
4. Transcreve o áudio com a API da OpenAI.
5. Gera um arquivo `.txt` com frases completas e timestamps.
6. Analisa a transcrição para identificar trechos problemáticos, como:
   - frases incompletas
   - trechos repetidos
   - cortes abruptos
   - erros de gravação percebidos no contexto
7. Remove do vídeo os trechos identificados com FFmpeg.
8. Salva o vídeo final editado na pasta de saída.

## Tecnologias usadas

- Electron
- Electron Vite
- React
- TypeScript
- FFmpeg
- OpenAI API

## Requisitos

Antes de executar o projeto, garanta que você tenha:

- Node.js 22 ou superior
- npm
- FFmpeg instalado e disponível no `PATH` do sistema
- uma chave válida da API da OpenAI

## Configuração

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure a variável de ambiente

O projeto usa um arquivo `.env` na raiz.

Exemplo:

```env
OPENAI_API_KEY=sua_chave_aqui
```

Observações:

- o arquivo `.env` já está ignorado pelo `.gitignore`

### 3. Verifique o FFmpeg

Confirme que o FFmpeg está acessível no terminal:

```bash
ffmpeg -version
```

Se esse comando falhar, instale o FFmpeg e adicione-o ao `PATH`.

## Como executar

### Ambiente de desenvolvimento

```bash
npm run dev
```

Isso abrirá o aplicativo Electron em modo de desenvolvimento.

## Como usar o aplicativo

1. Abra o app.
2. Clique em `Selecionar vídeo`.
3. Escolha um arquivo `.mp4`.
4. Clique em `Iniciar processo`.
5. Aguarde o término do fluxo automático.

Ao final, o app exibirá:

- o diretório de saída
- o caminho do áudio `.mp3`
- o caminho do arquivo `.txt` com a transcrição
- o caminho do vídeo final editado
- o resumo da análise feita pela IA
- os trechos removidos

## Estrutura de saída

Os arquivos gerados são salvos no Desktop, dentro da pasta:

```text
VIDEOS_EDITADOS/
```

Para cada vídeo processado, o app cria uma estrutura como esta:

```text
VIDEOS_EDITADOS/
  nome-do-video/
    nome-do-video.mp3
    nome-do-video_frases.txt
    nome-do-video_sem_erros.mp4
```

## Scripts disponíveis

### Desenvolvimento

```bash
npm run dev
```

### Verificação de tipos

```bash
npm run typecheck
```

### Build da aplicação

```bash
npm run build
```

### Build para Windows

```bash
npm run build:win
```

### Build para macOS

```bash
npm run build:mac
```

### Build para Linux

```bash
npm run build:linux
```

## Estrutura do projeto

Principais diretórios:

- `src/main`: processo principal do Electron
- `src/main/services`: regras de negócio, OpenAI, FFmpeg, transcrição e workflow
- `src/main/ipc`: registro dos handlers IPC
- `src/main/utils`: utilitários internos
- `src/preload`: ponte segura entre Electron e interface
- `src/renderer`: interface React
- `src/shared`: tipos compartilhados entre camadas

## Observações importantes

- O projeto depende de internet para acessar a API da OpenAI.
- O processamento pode levar mais tempo em vídeos maiores.
- A precisão da transcrição e da remoção dos trechos depende da qualidade do áudio.
- Se a OpenAI não retornar dados suficientes para uma etapa, o app usa caminhos de fallback em partes do fluxo para tentar concluir o processamento.
