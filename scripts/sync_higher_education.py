#!/usr/bin/env python3
import csv
import io
import json
import re
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

IES_URL = 'https://dadosabertos.mec.gov.br/images/conteudo/Ind-ensino-superior/2022/PDA_Lista_Instituicoes_Ensino_Superior_do_Brasil_EMEC.csv'
COURSES_URL = 'https://dadosabertos.mec.gov.br/images/conteudo/Ind-ensino-superior/2022/PDA_Dados_Cursos_Graduacao_Brasil.csv'
TECH_URL = 'https://dadosabertos.mec.gov.br/images/conteudo/cncst/cncst_2024_setec_dados.csv'
EMEC_URL = 'https://emec.mec.gov.br/emec/nova-index/'
OUTPUT = Path('public/higher-education.json')


def norm(value):
    text = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'SERFES-Higher-Education-Sync/1.0'})
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def decode(raw):
    for encoding in ('utf-8-sig', 'latin-1'):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            pass
    return raw.decode('utf-8', 'replace')


def rows_from(raw):
    text = decode(raw)
    sample = text[:10000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=';,\t|')
        delimiter = dialect.delimiter
    except Exception:
        delimiter = ';'
    return list(csv.DictReader(io.StringIO(text), delimiter=delimiter))


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
    if 'federal' in value and ('public' in value or 'publica' in value):
        return 'Federal'
    if 'estadual' in value and ('public' in value or 'publica' in value):
        return 'Estadual'
    if 'municipal' in value and ('public' in value or 'publica' in value):
        return 'Municipal'
    return 'Privada'


def load_institutions():
    rows = rows_from(fetch(IES_URL))
    institutions = {}
    for row in rows:
        uf = field(row, 'UF', 'Sigla da UF', 'SG_UF_IES')
        if norm(uf) != 'pr':
            continue
        situation = field(row, 'Situação da IES', 'Situacao da IES', 'SITUACAO_IES')
        if situation and 'ativa' not in norm(situation):
            continue
        name = field(row, 'Nome da IES', 'Instituição de Ensino Superior', 'NO_IES')
        municipality = field(row, 'Município', 'Municipio', 'NO_MUNICIPIO_IES')
        if not name or not municipality:
            continue
        ies_id = field(row, 'Código da IES', 'Codigo da IES', 'CO_IES') or name
        acronym = field(row, 'Sigla', 'Sigla da IES', 'SG_IES') or None
        category = field(row, 'Categoria da IES', 'Categoria Administrativa', 'DS_CATEGORIA_ADMINISTRATIVA')
        record = {
            'id': str(ies_id),
            'name': name,
            'acronym': acronym,
            'municipality': municipality,
            'network': network_from_category(category),
        }
        institutions[(record['id'], norm(municipality))] = record
    return sorted(institutions.values(), key=lambda item: (norm(item['municipality']), item['network'], norm(item['name'])))


def load_course_names():
    names = set()
    for row in rows_from(fetch(COURSES_URL)):
        situation = field(row, 'Situação do Curso', 'Situacao do Curso', 'SITUACAO_CURSO')
        if situation and 'ativo' not in norm(situation):
            continue
        name = field(row, 'Nome do Curso', 'Curso', 'NO_CURSO')
        if name:
            names.add(re.sub(r'\s+', ' ', name).strip())

    try:
        tech_rows = rows_from(fetch(TECH_URL))
        for row in tech_rows:
            name = field(row, 'Denominação do Curso', 'Denominacao do Curso', 'Nome do Curso', 'Curso')
            if name:
                names.add(re.sub(r'\s+', ' ', name).strip())
    except Exception as exc:
        print(f'AVISO: catálogo tecnológico 2024 indisponível: {exc}')

    return sorted(names, key=norm)


def main():
    institutions = load_institutions()
    courses = load_course_names()
    if len(institutions) < 50:
        raise RuntimeError(f'Catálogo de IES do Paraná incompleto: {len(institutions)} registros.')
    if len(courses) < 100:
        raise RuntimeError(f'Catálogo de cursos incompleto: {len(courses)} nomes.')

    payload = {
        'source': 'MEC/e-MEC',
        'sourceUrl': EMEC_URL,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'institutions': institutions,
        'courses': courses,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(institutions)} IES do Paraná e {len(courses)} denominações de cursos catalogadas.')


if __name__ == '__main__':
    main()
