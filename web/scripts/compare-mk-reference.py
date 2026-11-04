"""Compare actual native UI captures with the supplied application crops."""
import json,sys,statistics
from pathlib import Path
from PIL import Image,ImageChops,ImageStat,ImageDraw
directory=Path(sys.argv[1] if len(sys.argv)>1 else 'output/review/mk-v3/native')
reference=Path(json.loads(Path('design/reference.json').read_text())['directory'])/'app-screens'
metrics=[];sheets=[]
for number in range(1,83):
    identifier=f'MK-{number:02d}'
    expected=Image.open(reference/f'{identifier}.png').convert('RGB')
    actual=Image.open(directory/f'{identifier}.png').convert('RGB')
    if expected.size!=actual.size:raise ValueError(f'{identifier}: viewport mismatch')
    difference=ImageChops.difference(expected,actual)
    mean=sum(ImageStat.Stat(difference).mean)/3
    difference.save(directory/f'{identifier}-diff.png')
    Image.blend(expected,actual,.5).save(directory/f'{identifier}-overlay.png')
    metrics.append({'id':identifier,'mae255':round(mean,4),'reference':str(reference/f'{identifier}.png'),'actual':str(directory/f'{identifier}.png'),'overlay':str(directory/f'{identifier}-overlay.png'),'diff':str(directory/f'{identifier}-diff.png')})
    slot=(number-1)%12
    if slot==0:sheets.append(Image.new('RGB',(1170,1784),'#ddd'))
    sheet=sheets[-1];x=(slot%3)*390;y=(slot//3)*446
    ImageDraw.Draw(sheet).text((x+8,y+4),f'{identifier} Ref / App MAE={mean:.2f}',fill='black')
    for i,im in enumerate([expected,actual]):
        im.thumbnail((195,422));sheet.paste(im,(x+i*195,y+24))
for index,sheet in enumerate(sheets):sheet.save(directory/f'contact-{index+1}.jpg')
report={'metric':'Mean absolute RGB channel error, 0..255. This is not a UX correctness percentage.','includesExplicitPreviewLabel':True,'screens':metrics,'meanMae255':round(statistics.mean(x['mae255'] for x in metrics),4),'maxMae255':max(x['mae255'] for x in metrics)}
(directory/'comparison.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'screens':len(metrics),'meanMae255':report['meanMae255'],'maxMae255':report['maxMae255'],'largest':sorted(metrics,key=lambda x:-x['mae255'])[:8]},indent=2))
