"""Record a complete reviewed candidate; never promote it to the game implicitly."""
import argparse,hashlib,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];HD=ROOT/'assets/spritesheets/hd-128x256'
ORDER=['caballero','duelista','sacerdote','monje','cazador','explorador','elementalista','brujo']
def close(c,s):
    p=HD/'manifest.json';m=json.loads(p.read_text(encoding='utf-8'));v=next(v for v in m['variants'] if v['classId']==c and v['sex']==s)
    q=json.loads((HD/c/s/'qa-report.json').read_text(encoding='utf-8'));contact=json.loads((HD/c/s/'equipment-review/qa-report.json').read_text(encoding='utf-8'))
    if v['audit']['validFrames']!=60 or len(v['audit']['technicalActions'])!=15 or q['status']!='passed':raise ValueError('Variant incomplete')
    if contact['status']!='passed' or len(contact['actions'])!=15:raise ValueError('Equipment contacts require correction')
    for a,hashes in contact['bodyHashes'].items():
        for n,digest in enumerate(hashes,1):
            if hashlib.sha256((HD/c/s/'frames'/a/f'{c}-{s}-{a}-{n:02d}.png').read_bytes()).hexdigest()!=digest:raise ValueError('Contact review is stale')
    v['bodyProductionStatus']='all-60-frames-present-assistant-reviewed-candidate'
    v['equipmentCompatibility']={'status':'shared-layers-reviewed-candidate','report':f'assets/spritesheets/hd-128x256/{c}/{s}/equipment-review/qa-report.json','contactChecks':contact['contactChecks'],'warnings':0,'classSpecificOffsets':False,'equipmentLayerPolicy':'Exactly the existing sheets for this sex; no equipment changes to fit the new body.','userApproval':'pending'}
    for source in v['sources'].values():source['visualStatus']='candidate-assistant-reviewed-with-shared-equipment'
    variants=[v for v in m['variants'] if v['tier']==2];completed=[v for v in variants if v.get('equipmentCompatibility',{}).get('status')=='shared-layers-reviewed-candidate']
    m['tier2Production']={'status':'in-progress' if len(completed)<16 else 'candidate-library-complete-user-review-pending','classesInOrder':ORDER,'variantsExpected':16,'bodyFramesExpected':960,'completedVariants':[v['classId']+'-'+v['sex'] for v in completed],'bodyFramesPresent':sum(v['audit']['validFrames'] for v in variants),'sharedEquipment':'Existing male/female rigs and equipment sheets unchanged','runtimePromotion':'pending-complete-variant-review-and-user-approval'}
    pending=[v for v in variants if v not in completed];m['nextVariant']=pending[0]['classId']+'-'+pending[0]['sex'] if pending else None
    m['nextTask']='Continue all Tier 2 classes in the documented order, male then female, preserving canonical grips and quality.' if pending else 'Present all Tier 2 candidates and shared equipment comparisons for user review before game promotion.'
    m['runtimeIntegration']['userGameplayReview']={'status':'accepted-by-user','feedback':'Ya lo he probado y se ve bien. Seguimos con las clases de tier 2 por orden.','scope':'Previously integrated Novato, Tier 1 and shared equipment.','commit':'bf675a94e0060caa5bf16bcd3482ee1534a4d135'}
    p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    doc=ROOT/'docs/plan-spritesheets-hd-128x256.md';text=doc.read_text(encoding='utf-8');start='<!-- TIER2_PROGRESS_START -->';end='<!-- TIER2_PROGRESS_END -->'
    lines=[start,'## Producción HD de Tier 2','', 'El usuario ha probado la integración anterior de Novato, Tier 1 y equipo, la considera correcta y solicita continuar con Tier 2 en orden. Se mantiene el mismo esquema de agarres por sexo y el mismo proceso de originales grandes, cuatro poses por acción y commits por acción.','', '| Clase | Masculino | Femenino |','|---|---|---|']
    for cls in ORDER:
        entries=[]
        for sex in ('m','f'):
            item=next(v for v in variants if v['classId']==cls and v['sex']==sex)
            done=item in completed;entries.append('60 / 15 acciones; contactos revisados' if done else str(item['audit']['validFrames'])+' / 60 fotogramas')
        lines.append('| '+next(c['name'] for c in m['classes'] if c['id']==cls)+' | '+' | '.join(entries)+' |')
    lines+=['','Los atlas completos son candidatos para revisión del usuario. `revisar-contactos-clase-hd.py` reutiliza las capas de equipo ya existentes, registra los hashes corporales y genera comparativas de las quince acciones. El resultado técnico no sustituye la revisión artística. Las fuentes y revisiones sustituidas permanecen conservadas. Tier 2 no se activa automáticamente en el juego por generar un atlas.',end]
    block='\n'.join(lines)
    text=re.sub(re.escape(start)+r'.*?'+re.escape(end),lambda _:block,text,flags=re.S) if start in text else text+'\n\n'+block+'\n'
    doc.write_text(text,encoding='utf-8');print(json.dumps({'completeCandidate':c+'-'+s,'frames':60,'contactChecks':contact['contactChecks'],'nextVariant':m['nextVariant']}))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--class-id',choices=ORDER,required=True);p.add_argument('--sex',choices=('m','f'),required=True);a=p.parse_args();close(a.class_id,a.sex)
