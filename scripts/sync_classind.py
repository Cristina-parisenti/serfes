#!/usr/bin/env python3
import csv
import io
import json
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from urllib.parse import urlparse
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

PACKAGE_ID = '5138a6ca-8009-4ffb-b95a-052f76d62a33'
RESOURCE_ID = 'a59c1601-12d3-4e6d-a1d0-b036632fe00e'
PACKAGE_API = f'https://dados.mj.gov.br/api/3/action/package_show?id={PACKAGE_ID}'
RESOURCE_PAGE = f'https://dados.mj.gov.br/dataset/{PACKAGE_ID}/resource/{RESOURCE_ID}'
CURRENT_FALLBACK_CSV = (
    'https://dados.mj.gov.br/dataset/5138a6ca-8009-4ffb-b95a-052f76d62a33/'
    'resource/a59c1601-12d3-4e6d-a1d0-b036632fe00e/download/jogoeletronico202511141500.csv'
)
OUTPUT = Path('public/classind-ratings.json')

GAME_CATALOG = [
    {'id': 'free-fire', 'aliases': ['Free Fire', 'Garena Free Fire']},
    {'id': 'tekken', 'aliases': ['Tekken']},
    {'id': 'street-fighter', 'aliases': ['Street Fighter']},
    {'id': 'ea-fc', 'aliases': ['EA FC', 'EA Sports FC', 'FIFA']},
    {'id': 'pes', 'aliases': ['PES', 'Pro Evolution Soccer', 'eFootball']},
    {'id': 'fortnite', 'aliases': ['Fortnite']},
    {'id': 'valorant', 'aliases': ['Valorant']},
    {'id': 'league-of-legends', 'aliases': ['League of Legends']},
    {'id': 'counter-strike', 'aliases': ['Counter Strike', 'Counter-Strike', 'Counter-Strike 2', 'CS2']},
    {'id': 'brawl-stars', 'aliases': ['Brawl Stars']},
    {'id': 'clash-royale', 'aliases': ['Clash Royale']},
    {'id': 'just-dance', 'aliases': ['Just Dance']},
]


def norm(value):
    text = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def fetch_bytes(url, attempts=4, timeout=45):
    last_error = None
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'SERFES-ClassInd-Sync/1.0 (+https://github.com/Cristina-parisenti/serfes)',
                    'Accept': '*/*',
                },
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read()
        except Exception as exc:
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(3 * (attempt + 1))

    host = urlparse(url).hostname
    if host == 'dados.mj.gov.br':
        try:
            dns_req = urllib.request.Request(
                f'https://dns.google/resolve?name={host}&type=A',
                headers={'Accept': 'application/dns-json', 'User-Agent': 'SERFES-ClassInd-Sync/1.0'},
            )
            with urllib.request.urlopen(dns_req, timeout=20) as response:
                dns_payload = json.load(response)
            ips = [
                item.get('data') for item in dns_payload.get('Answer', [])
                if item.get('type') == 1 and item.get('data')
            ]
            for ip in ips:
                result = subprocess.run(
                    [
                        'curl', '--fail', '--silent', '--show-error', '--location',
                        '--connect-timeout', '20', '--max-time', str(max(timeout * 2, 60)),
                        '--retry', '2', '--retry-delay', '2',
                        '--resolve', f'{host}:443:{ip}',
                        '-H', 'User-Agent: SERFES-ClassInd-Sync/1.0',
                        url,
                    ],
                    capture_output=True,
                    check=False,
                )
                if result.returncode == 0 and result.stdout:
                    print(f'Fonte oficial acessada com resolução DNS alternativa ({ip}).', file=sys.stderr)
                    return result.stdout
                last_error = result.stderr.decode('utf-8', errors='replace').strip() or last_error
        except Exception as exc:
            last_error = exc

    raise RuntimeError(f'Falha ao acessar fonte oficial: {url}: {last_error}')


def fetch_package():
    try:
        raw = fetch_bytes(PACKAGE_API)
        payload = json.loads(raw.decode('utf-8'))
        if payload.get('success') and payload.get('result'):
            return payload['result']
    except Exception as exc:
        print(f'AVISO: metadados CKAN indisponíveis: {exc}', file=sys.stderr)
    return None


def resource_metadata(package):
    if not package:
        return {
            'url': CURRENT_FALLBACK_CSV,
            'last_modified': None,
            'id': RESOURCE_ID,
        }

    resources = package.get('resources') or []
    resource = next((item for item in resources if item.get('id') == RESOURCE_ID), None)
    if not resource:
        resource = next(
            (
                item for item in resources
                if (item.get('format') or '').upper() == 'CSV'
                and 'jogo' in (item.get('name') or '').lower()
                and 'rpg' not in (item.get('name') or '').lower()
            ),
            None,
        )
    if not resource:
        raise RuntimeError('Recurso oficial CSV de jogos eletrônicos não localizado no conjunto ClassInd.')
    return resource


def decode_csv(raw):
    for encoding in ('utf-8-sig', 'cp1252', 'latin-1'):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            pass
    raise RuntimeError('Não foi possível decodificar o CSV oficial do ClassInd.')


def read_rows(text):
    sample = text[:20000]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=';,\t|')
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ';' if sample.count(';') >= sample.count(',') else ','

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    headers = [header for header in (reader.fieldnames or []) if header]
    if not headers:
        raise RuntimeError('CSV oficial sem cabeçalhos reconhecíveis.')
    return headers, list(reader)


def choose_header(headers, kind):
    best = None
    best_score = -999
    for header in headers:
        h = norm(header)
        score = 0
        if kind == 'title':
            if 'titulo' in h:
                score += 20
            if 'nome' in h:
                score += 10
            if h == 'jogo' or 'nome jogo' in h or 'titulo jogo' in h:
                score += 12
            if any(x in h for x in ('requerente', 'empresa', 'distribuid', 'produtor', 'plataforma', 'genero')):
                score -= 20
        elif kind == 'classification':
            if 'classific' in h:
                score += 25
            if 'faixa etaria' in h:
                score += 20
            if 'idade' in h:
                score += 8
            if 'autoclassific' in h:
                score -= 5
        elif kind == 'id':
            if 'processo' in h:
                score += 20
            if 'registro' in h:
                score += 15
            if h == 'id' or h.endswith(' id'):
                score += 10
            if 'portaria' in h:
                score += 8
        elif kind == 'date':
            if 'data' in h:
                score += 8
            if 'public' in h:
                score += 10
            if 'classific' in h:
                score += 6
            if 'atualiz' in h:
                score += 12
        if score > best_score:
            best_score = score
            best = header

    minimum = {'title': 8, 'classification': 8, 'id': 6, 'date': 6}[kind]
    return best if best_score >= minimum else None


def parse_classification(value):
    text = norm(value)
    if not text:
        return None
    if text in {'l', 'livre'} or text.startswith('livre '):
        return 'L'

    values = []
    for number in (18, 16, 14, 12, 10, 6):
        if re.search(rf'(^|\D){number}(\D|$)', text):
            values.append(number)
    return max(values) if values else None


def parse_date(value):
    raw = str(value or '').strip()
    if not raw:
        return None
    formats = (
        '%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d',
        '%d/%m/%Y', '%d-%m-%Y', '%d/%m/%Y %H:%M:%S',
    )
    cleaned = raw.replace('Z', '').split('+')[0]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def iso_or_none(value):
    if not value:
        return None
    parsed = parse_date(value)
    if parsed:
        return parsed.isoformat().replace('+00:00', 'Z')
    return str(value)


def match_game(title):
    normalized_title = norm(title)
    if not normalized_title:
        return None, 0

    best_game = None
    best_score = 0
    for game in GAME_CATALOG:
        for alias in game['aliases']:
            normalized_alias = norm(alias)
            score = 0
            if normalized_title == normalized_alias:
                score = 100
            elif normalized_title.startswith(normalized_alias + ' '):
                score = 85
            elif (' ' + normalized_alias + ' ') in (' ' + normalized_title + ' '):
                score = 60
            if score > best_score:
                best_game = game
                best_score = score
    return best_game, best_score


def build_payload(resource, headers, rows):
    title_header = choose_header(headers, 'title')
    classification_header = choose_header(headers, 'classification')
    id_header = choose_header(headers, 'id')
    date_header = choose_header(headers, 'date')

    print('Cabeçalhos:', headers)
    print('Título:', title_header)
    print('Classificação:', classification_header)
    print('Identificador:', id_header)
    print('Data:', date_header)

    if not title_header or not classification_header:
        raise RuntimeError('Não foi possível identificar com segurança as colunas de título e classificação.')

    source_updated = iso_or_none(resource.get('last_modified') or resource.get('metadata_modified'))
    now = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    candidates = defaultdict(list)
    for row_index, row in enumerate(rows, start=2):
        title = str(row.get(title_header) or '').strip()
        classification = parse_classification(row.get(classification_header))
        game, score = match_game(title)
        if not game or not title:
            continue

        row_date = parse_date(row.get(date_header)) if date_header else None
        candidates[game['id']].append({
            'title': title,
            'classification': classification,
            'source_id': str(row.get(id_header) or '').strip() if id_header else f'linha-{row_index}',
            'row_date': row_date,
            'score': score,
        })

    records = []
    verified_count = 0

    for game in GAME_CATALOG:
        game_candidates = candidates.get(game['id'], [])
        if not game_candidates:
            records.append({
                'gameId': game['id'],
                'officialTitle': None,
                'classification': None,
                'status': 'not-found',
                'sourceRecordId': None,
                'sourceUpdatedAt': source_updated,
                'verifiedAt': now,
            })
            continue

        deduped = {}
        for item in game_candidates:
            key = norm(item['title'])
            current = deduped.get(key)
            current_date = current.get('row_date') if current else None
            item_date = item.get('row_date')
            replace = current is None
            if current is not None:
                if item_date and (not current_date or item_date > current_date):
                    replace = True
                elif item_date == current_date and item['score'] > current['score']:
                    replace = True
                elif item_date == current_date and item['score'] == current['score']:
                    current_age = current['classification'] if isinstance(current['classification'], int) else 0
                    item_age = item['classification'] if isinstance(item['classification'], int) else 0
                    if item_age > current_age:
                        replace = True
            if replace:
                deduped[key] = item

        ordered = sorted(
            deduped.values(),
            key=lambda item: (
                item['score'],
                item['row_date'].timestamp() if item.get('row_date') else 0,
                len(item['title']),
            ),
            reverse=True,
        )

        for item in ordered:
            classification = item['classification']
            status = 'verified' if classification is not None else 'pending'
            if status == 'verified':
                verified_count += 1
            records.append({
                'gameId': game['id'],
                'officialTitle': item['title'],
                'classification': classification,
                'status': status,
                'sourceRecordId': item['source_id'] or None,
                'sourceUpdatedAt': source_updated,
                'verifiedAt': now,
            })

    if verified_count == 0:
        raise RuntimeError('Nenhuma modalidade do catálogo SERFES foi vinculada a uma classificação oficial; arquivo atual não será substituído.')

    return {
        'source': 'ClassInd/MJSP',
        'sourceUrl': RESOURCE_PAGE,
        'generatedAt': now,
        'records': records,
    }


def main():
    package = fetch_package()
    resource = resource_metadata(package)
    url = resource.get('url') or CURRENT_FALLBACK_CSV
    print('Fonte oficial:', url)
    print('Última modificação informada:', resource.get('last_modified'))

    raw = fetch_bytes(url)
    text = decode_csv(raw)
    headers, rows = read_rows(text)
    print('Registros lidos:', len(rows))

    payload = build_payload(resource, headers, rows)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Catálogo SERFES atualizado:', OUTPUT)
    print('Registros de classificação produzidos:', len(payload['records']))


if __name__ == '__main__':
    main()
