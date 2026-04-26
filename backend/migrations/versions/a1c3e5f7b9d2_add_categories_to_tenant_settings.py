"""add categories to tenant_settings

Revision ID: a1c3e5f7b9d2
Revises: bdfbf11d9773
Create Date: 2026-04-10 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1c3e5f7b9d2'
down_revision = 'bdfbf11d9773'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('tenant_settings', sa.Column('categories', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('tenant_settings', 'categories')
