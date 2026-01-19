import React from 'react';
import actsData from '../data/acts.json';

// Simple component to find and display one specific act nicely
export default function ActSample({ id }: { id: string }) {
    const act = actsData.find(a => a.id === id);

    if (!act) {
        return <div className="alert alert--danger">Act with ID "{id}" not found.</div>;
    }

    const { full_content } = act;

    return (
        <div className="card shadow--md margin-bottom--lg">
            <div className="card__header">
                <h3>{act.title}</h3>
                <div>
                    <span className="badge badge--primary margin-right--sm">{act.category}</span>
                    <span className="badge badge--secondary">{act.sub_category}</span>
                </div>
            </div>
            <div className="card__body">
                <p><strong>Summary:</strong> {act.summary}</p>

                <hr />

                <div className="row">
                    <div className="col col--6">
                        <h4>Entities Identified</h4>
                        <ul>
                            {full_content.entities && full_content.entities.map((ent: any, i: number) => (
                                <li key={i}>
                                    <strong>{ent.entity_name}</strong> <span style={{ opacity: 0.6 }}>({ent.entity_type})</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="col col--6">
                        <h4>Key Sections</h4>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {full_content.sections && full_content.sections.map((sec: any, i: number) => (
                                <div key={i} className="margin-bottom--sm">
                                    <strong>Section {sec.section_number}:</strong> {sec.content.substring(0, 150)}...
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {full_content.amendments && full_content.amendments.length > 0 && (
                    <>
                        <hr />
                        <h4>Amendments</h4>
                        <div className="table-responsive">
                            <table>
                                <thead><tr><th>Type</th><th>Description</th></tr></thead>
                                <tbody>
                                    {full_content.amendments.map((amd: any, i: number) => (
                                        <tr key={i}>
                                            <td>{amd.type}</td>
                                            <td>{amd.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

            </div>
            <div className="card__footer">
                <small className="text--secondary">Analyzed by {act.full_content.model || 'AI Model'} on {new Date(act.timestamp).toDateString()}</small>
            </div>
        </div>
    );
}
