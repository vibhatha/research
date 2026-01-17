from setuptools import setup, find_packages

setup(
    name='ldf',
    version='0.1.0',
    packages=find_packages(),
    install_requires=[
        'click',
    ],
    entry_points={
        'console_scripts': [
            'ldf=ldf.cli:cli',
        ],
    },
)
