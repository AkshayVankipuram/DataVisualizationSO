#!dvp/bin/python
from glob import glob
import csv,os
import multiprocessing as mp
from nltk.corpus import stopwords
import contextlib, string

stoplist = set(stopwords.words('english'))

def remove_stopwords(text):
    text = filter(lambda x: x in string.printable, text)
    text = ' '.join([word for word in text.lower().split() if word not in stoplist])
    return text

def get_file(file):
    f = open(file,'r')
    c = csv.reader(f)
    print('Reading {0}...'.format(file))
    D = []
    for i,row in enumerate(c):
        if i > 0:
            rrow = [row[0],row[1],row[2],remove_stopwords(row[3]),row[5],row[7],row[8],row[10]]
            D.append(rrow)
    f.close()
    print('File read completed {0}'.format(file))
    print('Writing {0}...'.format(file))
    f = open(os.path.join('dataset',os.path.basename(file)),'w')
    c = csv.writer(f)
    c.writerows(D)
    f.close()
    print('File written {0}'.format(file))
    return 1

def main():
    files = glob('dataset/stackexchange2014/*.csv')
    pool = mp.Pool(processes=mp.cpu_count()+2)
    jobs = [pool.apply_async(get_file,args=(file,)) for file in files]
    pool.close()
    pool.join()
    for job in jobs:
        job.get()


if __name__ == "__main__":
    main()
