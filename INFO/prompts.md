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
1
Antes de criar a segunda funcionalidade, faça uma divisão da aplicações em abas no topo do aplicativo. Cada aba irá conter uma das funcionalidades, sendo a primeira funcionalidade a conversão do vídeo em áudio.

No mesmo formato da primeira funcionalidade, porém criando uma segunda aba na aplicação,crie uma funcionalidade para fazer uma transcriação do arquivo de áudio para um arquivo de texto no formato TXT com timestamps para cada frase utilizando uma IA para transcrição do próprio ChatGPT.

Dessa vez o botão para selecionar será usado para escolher um arquivo de áudio e após clicar no botão para iniciar a tarefa, o arquivo de texto gerado será salvo no mesmo local do arquivo de áudio, através do uso de uma ferramenta para transcrição do próprio ChatGPT deverá ser feita a transcrição do áudio selecionado em texto.

O formato do texto deverá ser TXT e ele deverá conter timestamps para o início e fim de cada frase. A transcrição deve ser feita da forma mais precisa possível.

Crie também um arquivo ".env" para conter a chave da API da OpenAI que será utilizada para realizar essa tarefa. Lembrando de adicionar a referência desse arquivo dentro do ".gitignore" para mantermos a segurança do projeto.

# Ajustes da segunda funcionalidade

Após testes com um vídeo curto é possível notar que a separação de frases não está sendo feita de forma precisa. Frases separadas estão sendo consideradas como uma só, sendo marcadas com o mesmo timestamp. Faça a transcrição ser mais precisa, separando palavra por palavra, marcando cada uma com o timestamp de início e fim. Palavras imcompletas ou erradas também precisam ser adicionadas na transcrição, a transcrição precisa ser completa e precisa.

# Ajustes da segunda funcionalidade 2

Ao invés de criar apenas um arquivo .txt, crie dois. Um será como está agora, apenas renomeando para conter "_palavras" no final do nome, enquanto o outro arquivo será nomeado com "_frases" no final e será separado por frases ao invés de palavras, como no formato atual. Quero os dois arquivos sendo gerados ao invés de somente um.

# Ajustes da segunda funcionalidade 3

Os arquivos foram criados, porém o arquivo contendo as frases não está separando as frases por timestamp de início e de fim, isso precisa ser feito, assim como é feito no arquivo de palavras.

# Última funcionalidade, cortar vídeo

Crie uma nova funcionalidade, em uma nova aba. Dessa vez, terão dois botões para seleção, em um, será selecionado o vídeo em MP4 e no outro será selecionado o arquivo de transcrição em TXT. A partir dos dois arquivos selecionados duas ações serão feitas, primeiro, a ferramenta de IA do ChatGPT irá analisar o texto transcrito e selecionar partes da transcrição para serem consideradas como erros de gravação, como frases cortadas e/ou incompletas de alguma forma, que não estejam de acordo com as outras frases da transcrição. A partir dessa seleção feita pela IA, o próximo passo é utilizar a ferramenta FFmpeg para fazer um corte no arquivo de vídeo referentes aos trexos de frases com problema selecionadas pela ferramenta de IA, utilizando os timestamps presentes no arquivo de texro para cortar corretamente os trechos de frases erradas do vídeo.

# Ajustes da última funcionalidade

A ferramenta de IA deve ser mais precisa no momento de detectar problemas nas transcrições dos áudios. Frases repetidas e incompletas também podem ser um sinal de problemas durante a gravação e devem ser cortados no fluxo dessa funcionalidade do app.

# Ajustando fluxo

Faça um ajuste no fluxo do aplicativo. Ao invés de termos abas e várias funcionalidades diferentes, agora o aplicativo fará tudo em uma só decisão inicial. Na tela da aplicação deverá ser requerido apenas um arquivo de vídeo no formato MP4 e, com o arquivo selecionado, após clicar no botão para iniciar o processo, todos os passos anteriores serão feitos. Será criada a pasta "VIDEOS_EDITADOS", dentro dela será criada uma pasta com o mesmo nome do vídeo selecionado, depois será feita a conversão do vídeo para um arquivo de áudio em MP3, depois será feita uma transcrição do aúdio para um arquivo TXT com timestamps, dessa vez apenas salvando o arquivo separando a transcrição por FRASES, depois, a partir da transcrição, será feita uma análise com a ferramenta de IA para selecionar trechos problemáticos do arquivo de vídeo e fazer os cortes no mesmo com a ferramenta FFmpeg. Ou seja, será feito apenas um resumo do fluxo do que já estava sendo feito anteiormente.

# Refatorando projeto

Faça uma organização melhor dos arquivos do projeto, criando pastas e arquivos separados por funcionalidade para ter uma maior legibilidade no projeto.

# Ajustes da segunda funcionalidade 4

O fluxo que faz a transcrição do áudio em texto está separando frases em timestamps diferentes, considerando uma frase só como se fossem duas. Essa operação precisa ser mais precisa, separando por timestamps frases completas, sem cortar as mesmas ao meio. Refaça o prompt que está gerando o arquivo em TXT para que ele seja mais preciso com o áudio.