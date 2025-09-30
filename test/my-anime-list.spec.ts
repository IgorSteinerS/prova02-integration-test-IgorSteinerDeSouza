import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';

describe('MyAnimeList API', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://api.myanimelist.net/v2';

  const accessToken = process.env.MAL_ACCESS_TOKEN;

  let animeIdParaTestar = 0;
  let mangaIdParaTestar = 0;

  p.request.setDefaultTimeout(30000);

  beforeAll(() => {
    p.reporter.add(rep);
    if (!accessToken) {
      throw new Error(
        'MAL_ACCESS_TOKEN não encontrado. Verifique seu arquivo .env ou a configuração de secrets do CI.'
      );
    }
  });

  afterAll(() => {
    p.reporter.end();
  });

  describe('Consulta de Informações da API', () => {
    it('Deve obter os detalhes de um anime específico pelo ID', async () => {
      await p
        .spec()
        .get(`${baseUrl}/anime/31240`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          title: 'Re:Zero kara Hajimeru Isekai Seikatsu'
        });
    });

    it('Deve obter o ranking de animes (Top 5 em lançamento)', async () => {
      await p
        .spec()
        .get(`${baseUrl}/anime/ranking`)
        .withQueryParams({
          ranking_type: 'all',
          limit: 5
        })
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema('data', { type: 'array' });
    });

    it('Deve obter a lista de animes da temporada de Verão de 2024', async () => {
      await p
        .spec()
        .get(`${baseUrl}/anime/season/2024/summer`)
        .withQueryParams('limit', 3)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          season: {
            year: 2024,
            season: 'summer'
          }
        });
    });

    it('Deve obter as informações do meu perfil de usuário', async () => {
      await p
        .spec()
        .get(`${baseUrl}/users/@me`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            location: { type: 'string' }
          }
        });
    });
  });

  describe('Gerenciando a lista de animes de um usuário', () => {
    it('Deve buscar por um anime e extrair seu ID', async () => {
      animeIdParaTestar = await p
        .spec()
        .get(`${baseUrl}/anime`)
        .withQueryParams({
          q: 'Witch Watch',
          limit: 1
        })
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .returns('data[0].node.id');
    });

    it('Deve adicionar o anime na lista com o status "assistindo"', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/anime/${animeIdParaTestar}/my_list_status`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .toss();

      await p
        .spec()
        .patch(`${baseUrl}/anime/${animeIdParaTestar}/my_list_status`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .withJson({
          status: 'watching',
          num_watched_episodes: 1
        })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          status: 'watching'
        });
    });

    it('Deve verificar se o anime foi adicionado à lista de "assistindo"', async () => {
      await p
        .spec()
        .get(`${baseUrl}/users/@me/animelist`)
        .withQueryParams({
          status: 'watching',
          limit: 100
        })
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike('data[*].node.id', [animeIdParaTestar]);
    });

    it('Deve remover o anime da lista do usuário', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/anime/${animeIdParaTestar}/my_list_status`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK);
    });
  });

  describe('Gerenciando a lista de mangás de um usuário', () => {
    it('Deve buscar por um mangá e adicioná-lo à lista com o status "lendo"', async () => {
      mangaIdParaTestar = await p
        .spec()
        .get(`${baseUrl}/manga`)
        .withQueryParams({ q: 'Gantz', limit: 1 })
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .returns('data[0].node.id');

      await p
        .spec()
        .delete(`${baseUrl}/manga/${mangaIdParaTestar}/my_list_status`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .toss();

      await p
        .spec()
        .patch(`${baseUrl}/manga/${mangaIdParaTestar}/my_list_status`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .withJson({
          status: 'reading',
          num_chapters_read: 1
        })
        .expectStatus(StatusCodes.OK);
    });

    it('Deve remover o mangá da lista do usuário', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/manga/${mangaIdParaTestar}/my_list_status`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK);
    });
  });
});
