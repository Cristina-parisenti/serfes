#!/usr/bin/env python3
import csv
import io
import json
import re
import subprocess
import unicodedata
import urllib.parse
import zipfile
from datetime import datetime, timezone
from pathlib import Path

SERES_ODATA_BASE = 'https://olinda.mec.gov.br/olinda-ide/servico/PDA_SERES/versao/v1/odata'
SERES_COURSES_URL = (
    f'{SERES_ODATA_BASE}/PDA_Dados_Cursos_Graduacao_Brasil'
    '?$format=json&$filter=UF%20eq%20%27PR%27&$top=10000'
)
MEC_DATASET_URL = 'https://dados.gov.br/dados/conjuntos-dados/sistema-e-mec---cursos-de-graduacao-do-brasil'
MEC_CSV_URL = 'https://dadosabertos.mec.gov.br/images/conteudo/Ind-ensino-superior/2022/PDA_Dados_Cursos_Graduacao_Brasil.csv'
MEC_SOURCE_URL = 'https://dadosabertos.mec.gov.br/indicadores-sobre-ensino-superior/item/183-cursos-de-graduacao-do-brasil'
INEP_ZIP_URL = 'https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip'
INEP_SOURCE_URL = 'https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior'
EMEC_URL = 'https://emec.mec.gov.br/emec/nova-index/'
OUTPUT = Path('public/higher-education.json')


def norm(value):
    text = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def fetch(url):
    command = [
        'curl', '-L', '--fail', '--silent', '--show-error', '--http1.1',
        '--retry', '5', '--retry-delay', '4', '--retry-all-errors',
        '--connect-timeout', '30', '--max-time', '600',
        '-H', 'Accept: application/json,text/csv,*/*',
        '-A', 'Mozilla/5.0 (compatible; SERFES-Higher-Education-Sync/4.0)',
        url,
    ]
    completed = subprocess.run(command, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.decode('utf-8', 'replace').strip())
    return completed.stdout


def decode(raw):
    for encoding in ('utf-8-sig', 'cp1252', 'latin-1'):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            pass
    return raw.decode('utf-8', 'replace')


def rows_from(raw):
    text = decode(raw)
    sample = text[:20000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=';,\t|')
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ';'
    return csv.DictReader(io.StringIO(text), delimiter=delimiter)


def field(row, *candidates):
    normalized = {norm(key): value for key, value in row.items() if key is not None}
    for candidate in candidates:
        target = norm(candidate)
        if target in normalized and str(normalized[target] or '').strip():
            return str(normalized[target]).strip()
    for candidate in candidates:
        target = norm(candidate)
        for key, value in normalized.items():
            if target in key and str(value or '').strip():
                return str(value).strip()
    return ''


def network_from_category(category):
    value = norm(category)
    numeric = re.sub(r'\D', '', value)
    if numeric == '1' or 'federal' in value:
        return 'Federal'
    if numeric == '2' or 'estadual' in value:
        return 'Estadual'
    if numeric == '3' or 'municipal' in value:
        return 'Municipal'
    return 'Privada'


def row_is_active(row):
    situation = field(
        row,
        'SITUACAO_CURSO',
        'Situação do Curso',
        'Situacao do Curso',
        'TP_SITUACAO',
        'DS_SITUACAO_CURSO',
    )
    if not situation:
        return True
    value = norm(situation)
    return 'ativo' in value or value in {'1', 'em atividade'}


def parse_rows(rows, source_label, source_url, data_year=None):
    institutions = {}
    courses = {}
    pr_rows = 0

    for row in rows:
        uf = field(row, 'UF', 'SG_UF', 'SG_UF_IES', 'Sigla da UF')
        if norm(uf) != 'pr' or not row_is_active(row):
            continue

        institution_name = field(
            row,
            'NOME_IES',
            'NO_IES',
            'Nome da IES',
            'Instituição de Ensino Superior',
            'Instituicao de Ensino Superior',
        )
        institution_id = field(
            row,
            'CODIGO_IES',
            'CO_IES',
            'Código da IES',
            'Codigo da IES',
        ) or institution_name
        municipality = field(row, 'MUNICIPIO', 'NO_MUNICIPIO', 'NO_MUNICIPIO_IES', 'Município', 'Municipio')
        municipality_id = field(
            row,
            'CODIGO_MUNICIPIO',
            'CO_MUNICIPIO',
            'CO_MUNICIPIO_IES',
            'Código do Município',
            'Codigo do Municipio',
        ) or norm(municipality)
        course_name = field(row, 'NOME_CURSO', 'NO_CURSO', 'Nome do Curso')
        course_id = field(row, 'CODIGO_CURSO', 'CO_CURSO', 'Código do Curso', 'Codigo do Curso') or course_name
        category = field(
            row,
            'CATEGORIA_ADMINISTRATIVA',
            'TP_CATEGORIA_ADMINISTRATIVA',
            'Categoria Administrativa',
            'Categoria da IES',
        )

        if not institution_name or not municipality:
            continue

        pr_rows += 1
        location_id = f'{institution_id}:{municipality_id}'
        network = network_from_category(category)
        if location_id not in institutions:
            institutions[location_id] = {
                'id': location_id,
                'name': re.sub(r'\s+', ' ', institution_name).strip(),
                'acronym': field(row, 'SIGLA', 'SG_IES', 'Sigla da IES') or None,
                'municipality': re.sub(r'\s+', ' ', municipality).strip(),
                'network': network,
            }

        if course_name:
            course_key = f'{course_id}:{location_id}'
            courses[course_key] = {
                'id': course_key,
                'name': re.sub(r'\s+', ' ', course_name).strip(),
                'institutionId': location_id,
                'municipality': re.sub(r'\s+', ' ', municipality).strip(),
                'network': network,
            }

    institution_list = sorted(
        institutions.values(),
        key=lambda item: (norm(item['municipality']), item['network'], norm(item['name'])),
    )
    course_list = sorted(
        courses.values(),
        key=lambda item: (norm(item['name']), norm(item['municipality']), item['institutionId']),
    )

    if len(institution_list) < 40:
        raise RuntimeError(f'Catálogo de IES do Paraná incompleto: {len(institution_list)} registros.')
    if len(course_list) < 100:
        raise RuntimeError(f'Catálogo de cursos do Paraná incompleto: {len(course_list)} ofertas.')

    return {
        'source': source_label,
        'sourceUrl': source_url,
        'emecUrl': EMEC_URL,
        'dataYear': data_year,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'institutions': institution_list,
        'courses': course_list,
    }, pr_rows


def load_seres_rows():
    rows = []
    url = SERES_COURSES_URL
    visited = set()

    while url:
        if url in visited:
            raise RuntimeError('Paginação circular detectada na API SERES/MEC.')
        visited.add(url)
        if len(visited) > 50:
            raise RuntimeError('A API SERES/MEC excedeu o limite seguro de páginas.')

        raw = fetch(url)
        text = decode(raw).strip()
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f'Resposta inválida da API SERES/MEC: {text[:500]}') from exc

        if not isinstance(data, dict):
            raise RuntimeError('Formato inesperado na API SERES/MEC.')
        if data.get('codigo') and not isinstance(data.get('value'), list):
            raise RuntimeError(str(data.get('mensagem') or data.get('message') or data)[:1000])

        page_rows = data.get('value')
        if not isinstance(page_rows, list):
            raise RuntimeError('A API SERES/MEC não retornou a coleção esperada de cursos.')
        rows.extend(page_rows)

        next_link = data.get('@odata.nextLink') or data.get('odata.nextLink')
        if not next_link:
            break
        url = urllib.parse.urljoin(SERES_ODATA_BASE + '/', str(next_link))

    if not rows:
        raise RuntimeError('A API SERES/MEC não retornou cursos localizados no Paraná.')
    return rows


def find_course_member(zf):
    members = [name for name in zf.namelist() if name.lower().endswith('.csv')]
    preferred = [name for name in members if 'cadastro' in norm(name) and 'curso' in norm(name)]
    if not preferred:
        preferred = [name for name in members if 'curso' in norm(name)]
    if not preferred:
        raise RuntimeError('Arquivo de cadastro de cursos não localizado no pacote oficial do Inep.')
    preferred.sort(key=lambda name: (0 if '2024' in name else 1, len(name)))
    return preferred[0]


def load_official_payload():
    errors = []

    try:
        seres_rows = load_seres_rows()
        payload, pr_rows = parse_rows(
            seres_rows,
            'SERES/MEC - Sistema e-MEC (API oficial de dados abertos)',
            MEC_DATASET_URL,
        )
        return payload, pr_rows
    except Exception as exc:
        errors.append(f'SERES/MEC API: {exc}')

    try:
        raw_csv = fetch(MEC_CSV_URL)
        payload, pr_rows = parse_rows(
            rows_from(raw_csv),
            'MEC/e-MEC - Cursos de Graduação do Brasil',
            MEC_SOURCE_URL,
        )
        return payload, pr_rows
    except Exception as exc:
        errors.append(f'MEC Dados Abertos legado: {exc}')

    try:
        raw_zip = fetch(INEP_ZIP_URL)
        with zipfile.ZipFile(io.BytesIO(raw_zip)) as zf:
            member = find_course_member(zf)
            print(f'Arquivo oficial selecionado: {member}')
            raw_courses = zf.read(member)
        payload, pr_rows = parse_rows(
            rows_from(raw_courses),
            'INEP/Censo da Educação Superior 2024 (cadastro originado do e-MEC)',
            INEP_SOURCE_URL,
            2024,
        )
        return payload, pr_rows
    except Exception as exc:
        errors.append(f'Inep Censo Superior: {exc}')

    raise RuntimeError('Nenhuma fonte oficial de ensino superior pôde ser baixada. ' + ' | '.join(errors))


def main():
    payload, pr_rows = load_official_payload()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(
        f"{len(payload['institutions'])} IES/localidades do Paraná e "
        f"{len(payload['courses'])} ofertas de graduação catalogadas a partir de {pr_rows} linhas oficiais."
    )


if __name__ == '__main__':
    main()
