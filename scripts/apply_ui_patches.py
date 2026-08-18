#!/usr/bin/env python3
from pathlib import Path

APP = Path('src/App.tsx')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f'Não foi possível aplicar ajuste: {label}')
    return text.replace(old, new, 1)


def main() -> None:
    text = APP.read_text(encoding='utf-8')

    text = replace_once(
        text,
        "  const [higherEducationCourse, setHigherEducationCourse] = useState('');\n",
        "  const [higherEducationCourse, setHigherEducationCourse] = useState('');\n"
        "  const [schoolAnnualConfirmation, setSchoolAnnualConfirmation] = useState(false);\n"
        "  const [schoolConfirmedYear, setSchoolConfirmedYear] = useState<number | null>(null);\n",
        'estado da confirmação anual',
    )

    text = replace_once(
        text,
        "  const minorStatus = athleteAge === null ? null : athleteAge < 18;\n",
        "  const minorStatus = athleteAge === null ? null : athleteAge < 18;\n"
        "  const schoolReferenceYear = ageReferenceDate.getFullYear();\n"
        "  const schoolConfirmationCurrent = enrollmentStatus !== 'Sim' || schoolConfirmedYear === schoolReferenceYear;\n",
        'ano de referência do vínculo escolar',
    )

    text = replace_once(
        text,
        "      setAthleteInstitution('');\n    }\n  }, [athleteAge, schoolLevel]);\n",
        "      setAthleteInstitution('');\n"
        "      setSchoolAnnualConfirmation(false);\n"
        "      setSchoolConfirmedYear(null);\n"
        "    }\n"
        "  }, [athleteAge, schoolLevel]);\n\n"
        "  useEffect(() => {\n"
        "    if (schoolConfirmedYear !== null && schoolConfirmedYear !== schoolReferenceYear) {\n"
        "      setSchoolAnnualConfirmation(false);\n"
        "    }\n"
        "  }, [schoolConfirmedYear, schoolReferenceYear]);\n",
        'renovação anual do vínculo escolar',
    )

    text = replace_once(
        text,
        "      (!schoolYearRequired || schoolYear.length > 0) &&\n"
        "      (!higherCourseRequired || higherEducationCourse.trim().length > 0)\n",
        "      (!schoolYearRequired || schoolYear.length > 0) &&\n"
        "      (!higherCourseRequired || higherEducationCourse.trim().length > 0) &&\n"
        "      schoolAnnualConfirmation\n",
        'validação da confirmação anual',
    )

    text = replace_once(
        text,
        "    setAthleteSaved(true);\n",
        "    setSchoolConfirmedYear(enrollmentStatus === 'Sim' ? schoolReferenceYear : null);\n"
        "    setAthleteSaved(true);\n",
        'registro do ano confirmado',
    )

    text = replace_once(
        text,
        "    if (!athleteSaved) {\n"
        "      setRegistrationMessage('Antes da inscrição em uma competição, complete e salve o seu cadastro.');\n"
        "      return;\n"
        "    }\n\n"
        "    const competition = competitions.find((item) => item.id === competitionId);\n",
        "    if (!athleteSaved) {\n"
        "      setRegistrationMessage('Antes da inscrição em uma competição, complete e salve o seu cadastro.');\n"
        "      return;\n"
        "    }\n\n"
        "    if (enrollmentStatus === 'Sim' && schoolConfirmedYear !== schoolReferenceYear) {\n"
        "      setRegistrationMessage(`Antes da inscrição, confirme novamente seu vínculo escolar referente ao ano letivo de ${schoolReferenceYear}.`);\n"
        "      return;\n"
        "    }\n\n"
        "    const competition = competitions.find((item) => item.id === competitionId);\n",
        'bloqueio de inscrição com vínculo anual vencido',
    )

    text = replace_once(
        text,
        "                  <article className=\"mini-status green\"><strong>{athleteInstitution ? 'Informado' : '—'}</strong><span>Vínculo escolar</span></article>\n",
        "                  <article className=\"mini-status green\"><strong>{athleteInstitution ? (schoolConfirmationCurrent ? `Confirmado ${schoolReferenceYear}` : 'Reconfirmação pendente') : '—'}</strong><span>Vínculo escolar</span></article>\n",
        'situação anual no painel do atleta',
    )

    resets = [
        (
            "                              if (nextValue !== 'Sim') {\n",
            "                              setSchoolAnnualConfirmation(false);\n"
            "                              setSchoolConfirmedYear(null);\n"
            "                              if (nextValue !== 'Sim') {\n",
            'alteração da situação de matrícula',
        ),
        (
            "                                setSchoolMunicipality(e.target.value);\n                                setSchoolNetwork('');\n",
            "                                setSchoolMunicipality(e.target.value);\n"
            "                                setSchoolAnnualConfirmation(false);\n"
            "                                setSchoolConfirmedYear(null);\n"
            "                                setSchoolNetwork('');\n",
            'alteração do município escolar',
        ),
        (
            "                                setSchoolNetwork(e.target.value);\n                                setAthleteInstitution('');\n",
            "                                setSchoolNetwork(e.target.value);\n"
            "                                setSchoolAnnualConfirmation(false);\n"
            "                                setSchoolConfirmedYear(null);\n"
            "                                setAthleteInstitution('');\n",
            'alteração da rede de ensino',
        ),
        (
            "                                setSchoolLevel(e.target.value);\n                                setSchoolYear('');\n",
            "                                setSchoolLevel(e.target.value);\n"
            "                                setSchoolAnnualConfirmation(false);\n"
            "                                setSchoolConfirmedYear(null);\n"
            "                                setSchoolYear('');\n",
            'alteração do nível de ensino',
        ),
        (
            "                                onChange={(e) => { setAthleteInstitution(e.target.value); setHigherEducationCourse(''); }}\n",
            "                                onChange={(e) => { setAthleteInstitution(e.target.value); setHigherEducationCourse(''); setSchoolAnnualConfirmation(false); setSchoolConfirmedYear(null); }}\n",
            'alteração da instituição',
        ),
        (
            "                              <select required value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)}>\n",
            "                              <select required value={schoolYear} onChange={(e) => { setSchoolYear(e.target.value); setSchoolAnnualConfirmation(false); setSchoolConfirmedYear(null); }}>\n",
            'alteração do ano escolar',
        ),
        (
            "                                onChange={(e) => setHigherEducationCourse(e.target.value)}\n",
            "                                onChange={(e) => { setHigherEducationCourse(e.target.value); setSchoolAnnualConfirmation(false); setSchoolConfirmedYear(null); }}\n",
            'alteração do curso superior',
        ),
    ]
    for old, new, label in resets:
        text = replace_once(text, old, new, label)

    old_sources = """                          )}
                        </div>
                        <div className="form-actions source-actions">
                          {schoolLevel === 'Ensino superior' ? (
                            <a className="secondary-button" href={higherEducation?.sourceUrl || 'https://emec.mec.gov.br/emec/nova-index/'} target="_blank" rel="noreferrer">Consultar cadastro oficial e-MEC</a>
                          ) : (
                            <a className="secondary-button" href={schoolDirectory?.sourceUrl || 'https://www.consultaescolas.pr.gov.br/consultaescolas/pages/templates/initial2.xhtml'} target="_blank" rel="noreferrer">Consultar base oficial da SEED/PR</a>
                          )}
                        </div>
"""
    new_sources = """                          )}
                          {enrollmentStatus === 'Sim' && (
                            <div className="annual-school-confirmation">
                              <div className="annual-school-confirmation-head">
                                <strong>Confirmação anual do vínculo escolar</strong>
                                <span>Ano letivo {schoolReferenceYear}</span>
                              </div>
                              <label className="annual-school-checkbox">
                                <input
                                  required
                                  type="checkbox"
                                  checked={schoolAnnualConfirmation}
                                  onChange={(e) => setSchoolAnnualConfirmation(e.target.checked)}
                                />
                                <span>Confirmo que, no ano letivo de {schoolReferenceYear}, a instituição e o ano escolar/curso informados acima correspondem à minha matrícula atual.</span>
                              </label>
                              <small className="field-help">Esta confirmação será solicitada novamente no início de cada ano. Se houver mudança de escola, instituição, ano escolar ou curso, será necessário atualizar e salvar o cadastro.</small>
                              {schoolConfirmedYear === schoolReferenceYear && <small className="annual-school-confirmed">Vínculo confirmado para {schoolReferenceYear}.</small>}
                            </div>
                          )}
                        </div>
                        {schoolLevel === 'Ensino superior' && (
                          <div className="form-actions source-actions">
                            <a className="secondary-button" href={higherEducation?.sourceUrl || 'https://emec.mec.gov.br/emec/nova-index/'} target="_blank" rel="noreferrer">Consultar cadastro oficial e-MEC</a>
                          </div>
                        )}
"""
    text = replace_once(text, old_sources, new_sources, 'confirmação anual e remoção do botão da SEED/PR')

    old_documents = """                          <div className="document-item"><FileText size={18} /><div><strong>Documento de identificação</strong><span>Não anexado</span></div></div>
                          <div className="document-item"><FileText size={18} /><div><strong>Comprovante de vínculo escolar</strong><span>Não anexado</span></div></div>
                          <div className="document-item"><FileSignature size={18} /><div><strong>Autorizações por competição</strong><span>{minorStatus === true ? 'Geradas no momento da inscrição' : 'Não se aplica'}</span></div></div>
                        </div>
                        <p className="prototype-note">Cada competição poderá possuir uma autorização própria, vinculada à respectiva solicitação de inscrição.</p>
"""
    new_documents = """                          <div className="document-item"><FileText size={18} /><div><strong>Documento de identificação do aluno</strong><span>Não anexado</span></div></div>
                          <div className="document-item"><FileText size={18} /><div><strong>Comprovante de vínculo escolar</strong><span>Não anexado</span></div></div>
                        </div>
"""
    text = replace_once(text, old_documents, new_documents, 'documentos do atleta')

    APP.write_text(text, encoding='utf-8')


if __name__ == '__main__':
    main()
