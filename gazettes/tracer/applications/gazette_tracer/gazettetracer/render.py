from flask import Flask, request, jsonify
from flask_cors import CORS
from doctracer import Neo4jInterface
from gazettetracer.setup_database import (load_gazette_data_from_csv,
                                        load_relationships_from_csv, 
                                        delete_gazette_data)
from gazettetracer.services import GazetteService
import click

class GazetteTracer:
    _instance = None
    _neo4j = None
    _service = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @property
    def neo4j(self):
        if self._neo4j is None:
            self._neo4j = Neo4jInterface()
        return self._neo4j

    @property
    def service(self):
        if self._service is None:
            self._service = GazetteService(self.neo4j)
        return self._service

    def create_app(self):
        """Create and configure the Flask application."""
        app = Flask(__name__)
        CORS(app)  # TODO: Replace with specific origins in production
        self.register_routes(app)
        return app

    def register_routes(self, app):
        """Register all route handlers."""
        
        @app.route("/timeline")
        def timeline():
            try:
                results = self.service.get_timeline()
                return jsonify(results)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @app.route("/graph")
        def graph():
            try:
                results = self.service.get_graph()
                return jsonify(results)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @app.route("/parents")
        def parents():
            try:
                results = self.service.get_parents()
                return jsonify(results)
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @app.route('/extract-text', methods=['POST'])
        def extract_text():
            pdf_url = request.json.get('pdf_url')
            if not pdf_url:
                return jsonify({'error': 'No PDF URL provided'}), 400

            try:
                text_content = self.service.extract_text(pdf_url)
                return jsonify({'text': text_content})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

# CLI Commands
@click.group()
def cli():
    """Gazette Tracer CLI tool for managing the application."""
    pass

@cli.command(name='start')
@click.option('--host', default='127.0.0.1', help='The host to bind to.')
@click.option('--port', default=5000, help='The port to bind to.')
@click.option('--debug', is_flag=True, help='Enable debug mode.')
def start_server(host, port, debug):
    """Start the Gazette Tracer web server."""
    gazette_tracer = GazetteTracer.get_instance()
    app = gazette_tracer.create_app()
    app.run(host=host, port=port, debug=debug)

@cli.command()
@click.argument('gazette_file', type=click.Path(exists=True))
@click.argument('gazette_relationship_file', type=click.Path(exists=True))
def insert(gazette_file, gazette_relationship_file):
    """Insert data from CSV files into the database."""
    gazette_tracer = GazetteTracer.get_instance()
    load_gazette_data_from_csv(gazette_tracer.neo4j, gazette_file)
    load_relationships_from_csv(gazette_tracer.neo4j, gazette_relationship_file)
    click.echo("✓ Data and relationships loaded successfully.")

@cli.command()
def delete():
    """Delete all Gazette data from the database."""
    gazette_tracer = GazetteTracer.get_instance()
    delete_gazette_data(gazette_tracer.neo4j)
    click.echo("✓ All Gazette data deleted successfully.")

if __name__ == '__main__':
    cli()
