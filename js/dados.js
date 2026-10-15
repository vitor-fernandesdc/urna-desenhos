// Lista de candidatos da urna.
// Regra dos números: o primeiro dígito é a década (7 = anos 70, 8 = anos 80,
// 9 = anos 90, 0 = anos 2000, 1 = anos 2010, 2 = anos 2020).
//
// Para colocar uma imagem do desenho, salve o arquivo na pasta img/
// e preencha o campo img, por exemplo: img: 'img/71.jpg', som: 'sons/71.mp3'
// (use imagens pequenas, até uns 100 KB, para o projeto continuar leve).
// Se o recorte da TV esconder o personagem, ajuste com o campo pos,
// por exemplo pos: '50% 70%' (o segundo valor desce o enquadramento).
// O campo som aponta para o trecho de áudio tocado quando o desenho aparece
// na tela (pasta sons/). Se o arquivo não existir, a urna só fica em silêncio.

const DECADAS = [
  { id: '70', nome: 'Anos 70',   cor: '#d9682b' },
  { id: '80', nome: 'Anos 80',   cor: '#e0457b' },
  { id: '90', nome: 'Anos 90',   cor: '#2a8f86' },
  { id: '00', nome: 'Anos 2000', cor: '#3b6fd8' },
  { id: '10', nome: 'Anos 2010', cor: '#6f9a1f' },
  { id: '20', nome: 'Anos 2020', cor: '#b8322f' }
];

const CANDIDATOS = [
  { num: '71', nome: 'Scooby-Doo',                decada: '70', vice: 'Salsicha',            img: 'img/71.jpg', som: 'sons/71.mp3' },
  { num: '72', nome: 'Super Amigos',              decada: '70', vice: 'Supergêmeos',         img: 'img/72.jpg', som: 'sons/72.mp3' },
  { num: '73', nome: 'Hong Kong Fu',              decada: '70', vice: 'Spot, o gato',        img: 'img/73.jpg', som: 'sons/73.mp3' },
  { num: '74', nome: 'Tutubarão',                 decada: '70', vice: 'Os Netunos',          img: 'img/74.jpg', som: 'sons/74.mp3' },
  { num: '75', nome: 'Capitão Caverna',           decada: '70', vice: 'As Panterinhas',      img: 'img/75.jpg', som: 'sons/75.mp3' },

  { num: '81', nome: 'Os Smurfs',                 decada: '80', vice: 'Papai Smurf',         img: 'img/81.jpg', som: 'sons/81.mp3' },
  { num: '82', nome: 'He-Man',                    decada: '80', vice: 'Gato Guerreiro',      img: 'img/82.jpg', som: 'sons/82.mp3' },
  { num: '83', nome: 'Caverna do Dragão',         decada: '80', vice: 'Mestre dos Magos',    img: 'img/83.jpg', som: 'sons/83.mp3' },
  { num: '84', nome: 'Transformers',              decada: '80', vice: 'Bumblebee',           img: 'img/84.jpg', som: 'sons/84.mp3' },
  { num: '85', nome: 'ThunderCats',               decada: '80', vice: 'Snarf',               img: 'img/85.jpg', som: 'sons/85.mp3' },

  { num: '91', nome: 'Cavaleiros do Zodíaco',     decada: '90', vice: 'Shiryu',              img: 'img/91.jpg', som: 'sons/91.mp3', sigla: 'CZ' },
  { num: '92', nome: 'Dragon Ball Z',             decada: '90', vice: 'Kuririn',             img: 'img/92.jpg', som: 'sons/92.mp3', sigla: 'DBZ' },
  { num: '93', nome: 'Pokémon',                   decada: '90', vice: 'Pikachu',             img: 'img/93.jpg', som: 'sons/93.mp3' },
  { num: '94', nome: 'O Laboratório de Dexter',   decada: '90', vice: 'Dee Dee',             img: 'img/94.jpg', som: 'sons/94.mp3' },
  { num: '95', nome: 'As Meninas Superpoderosas', decada: '90', vice: 'Professor Utônio',    img: 'img/95.jpg', som: 'sons/95.mp3' },

  { num: '01', nome: 'Bob Esponja',               decada: '00', vice: 'Patrick',             img: 'img/01.jpg', som: 'sons/01.mp3' },
  { num: '02', nome: 'Os Padrinhos Mágicos',      decada: '00', vice: 'Cosmo e Wanda',       img: 'img/02.jpg', som: 'sons/02.mp3' },
  { num: '03', nome: 'Avatar: A Lenda de Aang',   decada: '00', vice: 'Appa',                img: 'img/03.jpg', som: 'sons/03.mp3' },
  { num: '04', nome: 'Ben 10',                    decada: '00', vice: 'Vovô Max',            img: 'img/04.jpg', som: 'sons/04.mp3', sigla: 'B10' },
  { num: '05', nome: 'Naruto',                    decada: '00', vice: 'Sasuke',              img: 'img/05.jpg', som: 'sons/05.mp3' },

  { num: '11', nome: 'Hora de Aventura',          decada: '10', vice: 'Jake',                img: 'img/11.jpg', pos: '50% 70%', som: 'sons/11.mp3' },
  { num: '12', nome: 'Apenas um Show',            decada: '10', vice: 'Rigby',               img: 'img/12.jpg', som: 'sons/12.mp3' },
  { num: '13', nome: 'Gravity Falls',             decada: '10', vice: 'Mabel',               img: 'img/13.jpg', som: 'sons/13.mp3' },
  { num: '14', nome: 'Steven Universo',           decada: '10', vice: 'Garnet',              img: 'img/14.jpg', som: 'sons/14.mp3' },
  { num: '15', nome: 'O Incrível Mundo de Gumball', decada: '10', vice: 'Darwin',            img: 'img/15.jpg', som: 'sons/15.mp3', pos: '50% 78%' },

  { num: '21', nome: 'A Casa Coruja',             decada: '20', vice: 'King',                img: 'img/21.jpg', som: 'sons/21.mp3' },
  { num: '22', nome: 'Arcane',                    decada: '20', vice: 'Jinx',                img: 'img/22.jpg', som: 'sons/22.mp3' },
  { num: '23', nome: 'Invencível',                decada: '20', vice: 'Omni-Man',            img: 'img/23.jpg', som: 'sons/23.mp3' },
  { num: '24', nome: 'Bluey',                     decada: '20', vice: 'Bingo',               img: 'img/24.jpg', som: 'sons/24.mp3', pos: '50% 78%' },
  { num: '25', nome: 'Sonic Prime',               decada: '20', vice: 'Tails',               img: 'img/25.jpg', som: 'sons/25.mp3', pos: '50% 85%' }
];
