# Primeiro prompt para criar uma spec:

Você é um desenvolvedor de software especialista em aplicativos desktop utilizando Electron.

Crie uma SPEC (sem código, apenas requisitos funcionais e estrutura de dados) para criar um projeto de aplicativo desktop para edição de vídeos.

Contexto:
- O aplicativo será feito utilizando Electron, utilizando React através do Electron-Vite.
- O projeto utilizará TypeScript.
- Para editar os vídeos será utilizada a ferramenta FFmpeg.

# Primeira tela, seleção de arquivo

Você é um desenvolvedor de software especialista em aplicativos desktop utilizando Electron.

Crie uma tela principal para o projeto em Electron-Vite utilizando React e TypeScript onde a tela consiste em um botão para selecionar um arquivo de vídeo em MP4 e mostra como resultado o nome do arquivo na tela.

# Primeira funcionalidade, converter MP4 em MP3

Crie uma funcionalidade para converter o arquivo selecionado em um arquivo de áudio no formato MP3. A ferramenta utilizada para fazer essa conversão deverá ser o FFmpeg.

Deverá ser criada uma pasta chamada "VÍDEOS-EDITADOS" no desktop do dispositivo que está executando o aplicativo e dentro dessa pasta. Após um arquivo ser selecionado para ser editado deverá ser criada uma nova pasta dentro da pasta mencionada anteriormente que será nomeada com o nome do vídeo selecionado e todo o conteúdo gerado a partir desse vídeo selecionado será jogado dentro dessa pasta.

Após selecionar o arquivo e criar a pasta, deverá ser feita a conversão do vídeo em áudio através do uso da ferramenta FFmpeg, o formato do áudio deverá ser MP3.

# Ajustes da primeira funcionalidade

Alguns ajustes, faça um botão que confirme o processo de conversão após o arquivo ser selecionado, não quero que a conversão se inicie instantaneamente ao selecionar o arquivo.

Troque a cor padrão de amarelo para tons de roxo.

# Segunda funcionalidade, transcrever o áudio

Antes de criar a segunda funcionalidade, faça uma divisão da aplicações em abas no topo do aplicativo. Cada aba irá conter uma das funcionalidades, sendo a primeira funcionalidade a conversão do vídeo em áudio.

No mesmo formato da primeira funcionalidade, porém criando uma segunda aba na aplicação,crie uma funcionalidade para fazer uma transcriação do arquivo de áudio para um arquivo de texto no formato TXT com timestamps para cada frase utilizando uma IA para transcrição do próprio ChatGPT.

Dessa vez o botão para selecionar será usado para escolher um arquivo de áudio e após clicar no botão para iniciar a tarefa, o arquivo de texto gerado será salvo no mesmo local do arquivo de áudio, através do uso de uma ferramenta para transcrição do próprio ChatGPT deverá ser feita a transcrição do áudio selecionado em texto.

O formato do texto deverá ser TXT e ele deverá conter timestamps para o início e fim de cada frase. A transcrição deve ser feita da forma mais precisa possível.

Crie também um arquivo ".env" para conter a chave da API da OpenAI que será utilizada para realizar essa tarefa. Lembrando de adicionar a referência desse arquivo dentro do ".gitignore" para mantermos a segurança do projeto.