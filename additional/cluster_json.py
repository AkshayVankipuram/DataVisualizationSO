#!dvp/bin/python
from app import models
import gensim, json

def main(c):

    print('Running cluster{0}'.format(c))

    lda = gensim.models.ldamodel.LdaModel.load('app/static/resources/lda/lda_{0}'.format(c))
    topics = lda.show_topics(lda.num_topics)
    
    T = {}

    for i,topic in enumerate(topics):
        for word in topic.split('+'):
            T['Topic{0}'.format(i)] = []
            s = word.split('*')
            s = [w.strip() for w in s]
            if s[1].isalnum():
                T['Topic{0}'.format(i)].append({
                    'word' : s[1],
                    'weight' : s[0]
                })

    O = {}
    q = models.Question.query.filter_by(cluster=c)
    for i in range(0,len(topics)):
        t = 'Topic{0}'.format(i)
        O[t] = { 'words' : T[t], 'qlist' : {} }
        tq = q.filter_by(subcluster=i)
        for e in tq:
            O[t]['qlist'][e.title] = {
                'q' : {
                    'content' : e.content,
                    'votes' : e.vote,
                    'reputation' : e.reputation,
                    'user_id' : e.user_id
                },
                'a' : []
            }
            a = models.Answer.query.filter(models.Answer.title.contains(e.title))
            for ae in a:
                O[t]['qlist'][e.title]['a'].append({
                    'content' : ae.content,
                    'votes' : ae.vote,
                    'reputation' : ae.reputation,
                    'user_id' : ae.user_id
                })

    with open('clst_topics_data/cluster{0}.json'.format(c),'w') as f:
        json.dump(O,f)

if __name__ == "__main__":
    main(0)
