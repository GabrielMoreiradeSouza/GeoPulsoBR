import photoCredits from './photo-credits.json'

const photos = import.meta.glob<string>('../assets/images/*', { eager: true, query: '?url', import: 'default' })
type Credit = { place: string; author: string; license: string; licenseUrl: string | null; url: string }
const credits: Record<string, Credit | undefined> = photoCredits

const rows = [
  ['AC', 'Acre', 'acre', 'Norte', 'Rio Branco', -9.97, -67.81, 'acre.jpg'],
  ['AL', 'Alagoas', 'alagoas', 'Nordeste', 'Maceió', -9.67, -35.74, 'alagoas.jpg'],
  ['AP', 'Amapá', 'amapa', 'Norte', 'Macapá', 0.03, -51.07, 'amapa.jpg'],
  ['AM', 'Amazonas', 'amazonas', 'Norte', 'Manaus', -3.12, -60.02, 'amazonas.jpg'],
  ['BA', 'Bahia', 'bahia', 'Nordeste', 'Salvador', -12.97, -38.50, 'bahia.jpg'],
  ['CE', 'Ceará', 'ceara', 'Nordeste', 'Fortaleza', -3.72, -38.54, 'ceara.jpg'],
  ['DF', 'Distrito Federal', 'distrito-federal', 'Centro-Oeste', 'Brasília', -15.79, -47.88, 'destritofederal.jpg'],
  ['ES', 'Espírito Santo', 'espirito-santo', 'Sudeste', 'Vitória', -20.32, -40.34, 'espiritosanto.jpg'],
  ['GO', 'Goiás', 'goias', 'Centro-Oeste', 'Goiânia', -16.68, -49.25, 'goias.jpg'],
  ['MA', 'Maranhão', 'maranhao', 'Nordeste', 'São Luís', -2.53, -44.30, 'maranhao.jpg'],
  ['MT', 'Mato Grosso', 'mato-grosso', 'Centro-Oeste', 'Cuiabá', -15.60, -56.10, 'mato-grosso.jpeg'],
  ['MS', 'Mato Grosso do Sul', 'mato-grosso-do-sul', 'Centro-Oeste', 'Campo Grande', -20.47, -54.62, 'matogrossodosul.jpg'],
  ['MG', 'Minas Gerais', 'minas-gerais', 'Sudeste', 'Belo Horizonte', -19.92, -43.94, 'minasgerais.jpg'],
  ['PA', 'Pará', 'para', 'Norte', 'Belém', -1.46, -48.50],
  ['PB', 'Paraíba', 'paraiba', 'Nordeste', 'João Pessoa', -7.12, -34.86],
  ['PR', 'Paraná', 'parana', 'Sul', 'Curitiba', -25.43, -49.27],
  ['PE', 'Pernambuco', 'pernambuco', 'Nordeste', 'Recife', -8.05, -34.88],
  ['PI', 'Piauí', 'piaui', 'Nordeste', 'Teresina', -5.09, -42.80],
  ['RJ', 'Rio de Janeiro', 'rio-de-janeiro', 'Sudeste', 'Rio de Janeiro', -22.91, -43.17],
  ['RN', 'Rio Grande do Norte', 'rio-grande-do-norte', 'Nordeste', 'Natal', -5.79, -35.21],
  ['RS', 'Rio Grande do Sul', 'rio-grande-do-sul', 'Sul', 'Porto Alegre', -30.03, -51.23],
  ['RO', 'Rondônia', 'rondonia', 'Norte', 'Porto Velho', -8.76, -63.90],
  ['RR', 'Roraima', 'roraima', 'Norte', 'Boa Vista', 2.82, -60.67],
  ['SC', 'Santa Catarina', 'santa-catarina', 'Sul', 'Florianópolis', -27.60, -48.55],
  ['SP', 'São Paulo', 'sao-paulo', 'Sudeste', 'São Paulo', -23.55, -46.63],
  ['SE', 'Sergipe', 'sergipe', 'Nordeste', 'Aracaju', -10.91, -37.07],
  ['TO', 'Tocantins', 'tocantins', 'Norte', 'Palmas', -10.18, -48.33],
] as const

export const states = rows.map(([uf, name, slug, region, capital, latitude, longitude, filename]) => ({
  uf, name, slug, region, capital, latitude, longitude,
  image: photos['../assets/images/' + (filename ?? slug + '.webp')],
  credit: credits[slug],
}))

export type State = (typeof states)[number]
export const stateByUf = new Map<string, State>(states.map(state => [state.uf, state]))
