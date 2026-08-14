#!/usr/bin/env python3
import csv
import io
import json
import re
import subprocess
import unicodedata
import zipfile
from datetime import datetime, timezone
from pathlib import Path

INEP_ZIP_URL = 'https://download.inep.gov.br/microdados/microdados_censo_da_educacao_superior_2024.zip'
INEP_SOURCE_URL = 'https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior'
EMEC_URL = 'https://emec.mec.gov.br/emec/nova-index/'
OUTPUT = Path('public/higher-education.json')


def norm(value):
    text = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def fetch(url):
    command = [
        'curl', '-L', '--fail', '--silent', '--show-error',
        '--retry', '6', '--retry-delay', '4', '--retry-all-errors',
        '--connect-timeout', '30', '--max-time', '600',
        '-A', 'Mozilla/5.0 (compatible; SERFES-Higher-Education-Sync/2.1)',
        url,
    ]
    completed = subprocess.run(command, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if completed.returncode != 0:
        raise RuntimeError(f'Falha ao baixar a fonte oficial do Inep: {completed.stderr.decode("utf-8", "replace").strip()}')
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


def find_course_member(zf):
    members = [name for name in zf.namelist() if name.lower().endswith('.csv')]
    preferred = [name for name in members if 'cadastro' in norm(name) and 'curso' in norm(name)]
    if not preferred:
        preferred = [name for name in members if 'curso' in norm(name)]
    if not preferred:
        raise RuntimeError('Arquivo de cadastro de cursos não localizado no pacote oficial do Inep.')
    preferred.sort(key=lambda name: (0 if '2024' in name else 1, len(name)))
    return preferred[0]


def main():
    raw_zip = fetch(INEP_ZIP_URL)
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as zf:
        member = find_course_member(zf)
        print(f'Arquivo oficial selecionado: {member}')
        raw_courses = zf.read(member)

    institutions = {}
    course_names = set()
    pr_rows = 0

    for row in rows_from(raw_courses):
        uf = field(row, 'SG_UF', 'SG_UF_IES', 'UF', 'Sigla da UF')
        if norm(uf) != 'pr':
            continue

        institution_name = field(row, 'NO_IES', 'Nome da IES', 'Instituição de Ensino Superior')
        institution_id = field(row, 'CO_IES', 'Código da IES', 'Codigo da IES') or institution_name
        municipality = field(row, 'NO_MUNICIPIO', 'NO_MUNICIPIO_IES', 'Município', 'Municipio')
        course_name = field(row, 'NO_CURSO', 'Nome do Curso', 'Curso')
        category = field(row, 'TP_CATEGORIA_ADMINISTRATIVA', 'Categoria Administrativa', 'Categoria da IES')

        if not institution_name or not municipality:
            continue

        pr_rows += 1
        key = (str(institution_id), norm(municipality))
        if key not in institutions:
            institutions[key] = {
                'id': str(institution_id),
                'name': institution_name,
                'acronym': None,
                'municipality': municipality,
                'network': network_from_category(category),
            }

        if course_name:
            course_names.add(re.sub(r'\s+', ' ', course_name).strip())

    institution_list = sorted(
        institutions.values(),
        key=lambda item: (norm(item['municipality']), item['network'], norm(item['name'])),
    )
    courses = sorted(course_names, key=norm)

    if len(institution_list) < 50:
        raise RuntimeError(f'Catálogo de IES do Paraná incompleto: {len(institution_list)} registros.')
    if len(courses) < 100:
        raise RuntimeError(f'Catálogo de cursos do Paraná incompleto: {len(courses)} denominações.')

    payload = {
        'source': 'INEP/Censo da Educação Superior 2024 (cadastro originado do e-MEC)',
        'sourceUrl': INEP_SOURCE_URL,
        'emecUrl': EMEC_URL,
        'dataYear': 2024,
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'institutions': institution_list,
        'courses': courses,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(institution_list)} registros de IES/localidades do Paraná e {len(courses)} denominações de cursos catalogadas a partir de {pr_rows} linhas do Censo Superior 2024.')


if __name__ == '__main__':
    main()
