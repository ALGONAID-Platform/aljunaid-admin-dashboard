import json
calls = json.load(open('replacements.json', encoding='utf-8'))
content = open('src/modules/lessons/pages/LessonsPage.tsx', encoding='utf-8').read()
lines = content.split('\n')
for call in calls:
    for chunk in reversed(call['ReplacementChunks']):
        start = chunk['StartLine'] - 1
        end = chunk['EndLine']
        lines = lines[:start] + chunk['ReplacementContent'].split('\n') + lines[end:]
open('src/modules/lessons/pages/LessonsPage.tsx', 'w', encoding='utf-8').write('\n'.join(lines))
