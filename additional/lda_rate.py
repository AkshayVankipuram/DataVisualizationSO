#!dvp/bin/python
from app import models, db
import gensim, os
from glob import glob

def main(mdl,dic,cluster):
    print('Cluster{0}'.format(cluster))
    lda = gensim.models.ldamodel.LdaModel.load(mdl)
    dictionary = gensim.corpora.Dictionary.load(dic)
    q = models.Question.query.filter_by(cluster=cluster)
    for e in q:
        sims = lda[dictionary.doc2bow(e.text.lower().split())]
        m = max(sims,key=lambda x: x[1])
        e.subcluster = int(m[0])


if __name__ == "__main__":
    root = 'app/static/resources/lda/'
    mdls = glob('{0}lda_*'.format(root))
    mdls = filter(lambda x: 'state' not in x, mdls)
    for mdl in mdls:
        c = int(mdl.split('_')[1])
        if c == 0:
            continue
        main(mdl,'{0}cluster{1}.dict'.format(root,c),c)
    db.session.commit()
