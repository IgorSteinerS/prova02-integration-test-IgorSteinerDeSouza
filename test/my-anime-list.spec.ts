import pactum from 'pactum';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';

describe('MyAnimeList API', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://api.myanimelist.net/v2';

  const accessToken = process.env.MAL_ACCESS_TOKEN;

  let animeId = 0;

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

  describe('Gerenciando a lista de animes de um usuário', () => {
    it('Deve buscar por um anime e extrair seu ID', async () => {
      animeId = await p
        .spec()
        .get(`${baseUrl}/anime`)
        .withQueryParams({
          q: 'Witch Watch',
          limit: 1
        })
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          data: [
            {
              node: {
                title: 'Witch Watch'
              }
            }
          ]
        })
        .returns('data[0].node.id');
    });

    it('Deve adicionar o anime na lista com o status "assistindo"', async () => {
      await p
        .spec()
        .put(`${baseUrl}/anime/${animeId}/my_list_status`)
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
          limit: 100,
          fields: 'list_status'
        })
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)

        .expectJsonLike('data[*].node.id', [animeId]);
    });

    it('Deve remover o anime da lista do usuário', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/anime/${animeId}/my_list_status`)
        .withHeaders('Authorization', `Bearer ${accessToken}`)
        .expectStatus(StatusCodes.OK)
        .expectBodyContains('');
    });
  });
});
