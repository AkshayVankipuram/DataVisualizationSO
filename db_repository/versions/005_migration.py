from sqlalchemy import *
from migrate import *


from migrate.changeset import schema
pre_meta = MetaData()
post_meta = MetaData()
qanda = Table('qanda', post_meta,
    Column('title', String(length=256), primary_key=True, nullable=False),
    Column('qtext', Text),
    Column('qcode', Text),
    Column('quser_id', String(length=128)),
    Column('qvote', Integer),
    Column('qreputation', Integer),
    Column('atext', Text),
    Column('acode', Text),
    Column('auser_id', String(length=128)),
    Column('avote', Integer),
    Column('areputation', Integer),
    Column('tag', Text),
    Column('rating', Integer),
)


def upgrade(migrate_engine):
    # Upgrade operations go here. Don't create your own engine; bind
    # migrate_engine to your metadata
    pre_meta.bind = migrate_engine
    post_meta.bind = migrate_engine
    post_meta.tables['qanda'].columns['rating'].create()


def downgrade(migrate_engine):
    # Operations to reverse the above upgrade go here.
    pre_meta.bind = migrate_engine
    post_meta.bind = migrate_engine
    post_meta.tables['qanda'].columns['rating'].drop()
