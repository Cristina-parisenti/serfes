#!/usr/bin/env python3
import html as htmlmod
import http.cookiejar
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE_URL = 'https://www.consultaescolas.pr.gov.br/consultaescolas/pages/templates/initial2.xhtml'
OUTPUT = Path('public/schools-pr.json')
NETWORKS = [('1', 'Federal'), ('2', 'Estadual'), ('3', 'Municipal'), ('4', 'Privada')]
NETWORK_FILES = {
    'Federal': Path('public/schools-pr-federal.json'),
    'Estadual': Path('public/schools-pr-estadual.json'),
    'Municipal': Path('public/schools-pr-municipal.json'),
    'Privada': Path('public/schools-pr-privada.json'),
}


def clean_text(value: str) -> str:
    value = htmlmod.unescape(re.sub(r'<[^>]+>', '', value or ''))
    return re.sub(r'\s+', ' ', value).strip()


def usable_school_name(value: str) -> bool:
    normalized = clean_text(value).lower()
    if not normalized:
        return False
    # A Consulta Escolas ocasionalmente devolve o toString interno de um objeto
    # Java no lugar do rótulo exibido. Esses valores não são nomes de escola.
    return not normalized.startswith('br.gov.pr.') and 'estabelecimentows@' not in normalized


def parse_options(html: str, input_id_suffix: str):
    match = re.search(
        r'<select[^>]+id="[^"]*' + re.escape(input_id_suffix) + r'".*?</select>',
        html,
        re.I | re.S,
    )
    if not match:
        return []
    options = re.findall(r'<option([^>]*)>(.*?)</option>', match.group(0), re.I | re.S)
    result = []
    for attrs, label_html in options:
        label = clean_text(label_html)
        value_match = re.search(r'value="([^"]*)"', attrs, re.I)
        value = htmlmod.unescape(value_match.group(1)) if value_match else ''
        if label and label != 'Selecione...':
            result.append((value, label))
    return result


class ConsultaEscolasSession:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.action = BASE_URL
        self.view_state = ''
        self.municipalities = []
        self.open()

    def open(self):
        request = urllib.request.Request(BASE_URL, headers={'User-Agent': 'SERFES-School-Sync/1.1'})
        with self.opener.open(request, timeout=50) as response:
            page = response.read().decode('utf-8', 'replace')
            self.action = response.geturl()
        states = re.findall(r'name="javax.faces.ViewState"[^>]+value="([^"]+)"', page)
        if not states:
            raise RuntimeError('ViewState não localizado na página oficial da Consulta Escolas.')
        self.view_state = htmlmod.unescape(states[-1])
        self.municipalities = parse_options(page, 'municipio_input')
        if len(self.municipalities) < 300:
            raise RuntimeError('Relação de municípios incompleta na fonte oficial.')

    def schools(self, municipality_code: str, network_code: str):
        data = {
            'javax.faces.partial.ajax': 'true',
            'javax.faces.source': 'initial:j_idt80:redeEnsino',
            'javax.faces.partial.execute': 'initial:j_idt80:municipio initial:j_idt80:redeEnsino',
            'javax.faces.partial.render': 'initial:j_idt80:escola',
            'javax.faces.behavior.event': 'change',
            'javax.faces.partial.event': 'change',
            'initial:j_idt80:redeEnsino': 'initial:j_idt80:redeEnsino',
            'initial:j_idt80:municipio_input': municipality_code,
            'initial:j_idt80:redeEnsino_input': network_code,
            'javax.faces.ViewState': self.view_state,
        }
        body = urllib.parse.urlencode(data).encode()
        request = urllib.request.Request(
            self.action,
            data=body,
            headers={
                'User-Agent': 'SERFES-School-Sync/1.1',
                'Faces-Request': 'partial/ajax',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            },
        )
        with self.opener.open(request, timeout=50) as response:
            partial = response.read().decode('utf-8', 'replace')
        state_match = re.search(
            r'<update id="javax.faces.ViewState"><!\[CDATA\[(.*?)\]\]></update>',
            partial,
            re.S,
        )
        if state_match:
            self.view_state = state_match.group(1)
        decoded = htmlmod.unescape(partial)
        return parse_options(decoded, 'escola_input')


def write_payload(path: Path, records, generated_at: str):
    payload = {
        'source': 'Consulta Escolas/SEED-PR',
        'sourceUrl': BASE_URL,
        'generatedAt': generated_at,
        'records': records,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    session = ConsultaEscolasSession()
    records = []
    failures = []
    total_pairs = len(session.municipalities) * len(NETWORKS)
    pair_index = 0

    for municipality_code, municipality_name in session.municipalities:
        for network_code, network_name in NETWORKS:
            pair_index += 1
            try:
                schools = session.schools(municipality_code, network_code)
            except Exception:
                try:
                    time.sleep(1)
                    session = ConsultaEscolasSession()
                    schools = session.schools(municipality_code, network_code)
                except Exception as retry_exc:
                    failures.append(f'{municipality_name}/{network_name}: {retry_exc}')
                    schools = []
            for school_id, school_name in schools:
                if not usable_school_name(school_name):
                    print(f'AVISO: rótulo inválido ignorado em {municipality_name}/{network_name}: {school_name}')
                    continue
                records.append({
                    'id': str(school_id),
                    'name': school_name,
                    'municipality': municipality_name,
                    'network': network_name,
                })
            if pair_index % 100 == 0:
                print(f'{pair_index}/{total_pairs} filtros consultados; {len(records)} instituições coletadas.')
            time.sleep(0.04)

    unique = {}
    for record in records:
        key = (record['id'], record['municipality'], record['network'])
        unique[key] = record
    records = sorted(unique.values(), key=lambda item: (item['municipality'], item['network'], item['name']))

    if len(records) < 1000:
        raise RuntimeError(f'Coleta oficial considerada incompleta: apenas {len(records)} instituições.')
    if len(failures) > 25:
        raise RuntimeError(f'Muitas falhas na coleta oficial ({len(failures)}). Catálogo anterior preservado.')

    generated_at = datetime.now(timezone.utc).isoformat()
    write_payload(OUTPUT, records, generated_at)

    for network_name, path in NETWORK_FILES.items():
        network_records = [record for record in records if record['network'] == network_name]
        if not network_records:
            raise RuntimeError(f'Nenhuma instituição localizada para a rede {network_name}.')
        write_payload(path, network_records, generated_at)
        print(f'{network_name}: {len(network_records)} instituições.')

    print(f'Catálogo geral concluído com {len(records)} instituições do Paraná.')
    if failures:
        print('Falhas pontuais:', *failures, sep='\n- ')


if __name__ == '__main__':
    main()
