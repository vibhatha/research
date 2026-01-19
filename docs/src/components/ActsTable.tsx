import React, { useState, useMemo } from 'react';
import actsData from '../data/acts.json';

// Define the shape of our data
interface Act {
    id: string;
    title: string;
    summary: string;
    category: string;
    sub_category: string;
    entities_count: number;
    timestamp: string;
    full_content: any;
}

export default function ActsTable() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set(actsData.map((act) => act.category));
        return ['All', ...Array.from(cats)];
    }, []);

    // Filter data
    const filteredActs = useMemo(() => {
        return actsData.filter((act) => {
            const matchesSearch =
                act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                act.summary.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || act.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    const toggleExpand = (id: string) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    }

    return (
        <div className="margin-vert--lg">
            <div className="row margin-bottom--md">
                <div className="col col--6">
                    <input
                        type="text"
                        className="button button--outline button--secondary button--block"
                        style={{ textAlign: 'left', cursor: 'text' }}
                        placeholder="Search acts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="col col--4">
                    <select
                        className="button button--outline button--secondary button--block"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col col--2">
                    <div className="badge badge--primary">{filteredActs.length} Acts</div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table table--striped table--hover">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Summary</th>
                            <th>Entities</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredActs.map((act) => (
                            <React.Fragment key={act.id}>
                                <tr onClick={() => toggleExpand(act.id)} style={{ cursor: 'pointer' }}>
                                    <td><strong>{act.title}</strong></td>
                                    <td>
                                        <span className="badge badge--secondary">{act.category}</span>
                                        {act.sub_category && <div style={{ fontSize: '0.8em', color: 'gray' }}>{act.sub_category}</div>}
                                    </td>
                                    <td>{act.summary.substring(0, 100)}...</td>
                                    <td>{act.entities_count}</td>
                                </tr>
                                {expandedRow === act.id && (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="alert alert--info">
                                                <h4>Details</h4>
                                                <p><strong>Full Summary:</strong> {act.summary}</p>
                                                {act.full_content.referenced_acts && (
                                                    <div>
                                                        <strong>Referenced Acts:</strong>
                                                        <ul>
                                                            {act.full_content.referenced_acts.map((ref: string, i: number) => (
                                                                <li key={i}>{ref}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                <p><small>Analyzed on: {new Date(act.timestamp).toLocaleDateString()}</small></p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredActs.length === 0 && (
                <div className="text--center margin-vert--xl">
                    <p>No acts found matching your criteria.</p>
                </div>
            )}
        </div>
    );
}
