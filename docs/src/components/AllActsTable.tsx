import React, { useState, useMemo } from 'react';
import allActsData from '../data/all_acts.json';

// Define the shape
interface LibraryAct {
    id: string;
    title: string;
    number: string;
    date: string;
    domain: string;
    pdf_url: string;
    analyzed: boolean;
}

const ITEMS_PER_PAGE = 20;

export default function AllActsTable() {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDomain, setSelectedDomain] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);

    // Extract unique domains
    const domains = useMemo(() => {
        const d = new Set(allActsData.map((act) => act.domain));
        // Remove empty ones if any
        const clean = Array.from(d).filter(x => x && x.trim() !== '');
        return ['All', ...clean.sort()];
    }, []);

    // Filter
    const filteredActs = useMemo(() => {
        return allActsData.filter((act) => {
            const title = act.title || '';
            const number = act.number || '';
            const domain = act.domain || '';

            const matchSearch =
                title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                number.toLowerCase().includes(searchTerm.toLowerCase());

            const matchDomain = selectedDomain === 'All' || domain === selectedDomain;

            return matchSearch && matchDomain;
        });
    }, [searchTerm, selectedDomain]);

    // Pagination
    const totalPages = Math.ceil(filteredActs.length / ITEMS_PER_PAGE);
    const currentData = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredActs.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredActs, currentPage]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to p1 on search
    }

    const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedDomain(e.target.value);
        setCurrentPage(1);
    }

    return (
        <div className="margin-vert--lg">
            <div className="row margin-bottom--md">
                <div className="col col--6">
                    <input
                        type="text"
                        className="button button--outline button--secondary button--block"
                        style={{ textAlign: 'left', cursor: 'text' }}
                        placeholder="Search by title or number..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
                <div className="col col--4">
                    <select
                        className="button button--outline button--secondary button--block"
                        value={selectedDomain}
                        onChange={handleDomainChange}
                    >
                        {domains.map((d) => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                <div className="col col--2">
                    <div className="badge badge--secondary">{filteredActs.length} Items</div>
                </div>
            </div>

            <div className="table-responsive">
                <table className="table table--striped table--hover">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Act No.</th>
                            <th>Title</th>
                            <th>Domain</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((act) => (
                            <tr key={act.id}>
                                <td style={{ whiteSpace: 'nowrap' }}>{act.date}</td>
                                <td style={{ whiteSpace: 'nowrap' }}>{act.number}</td>
                                <td>
                                    {act.title}
                                    {act.analyzed && <span className="badge badge--success margin-left--sm">Analyzed</span>}
                                </td>
                                <td><small>{act.domain}</small></td>
                                <td>
                                    {act.pdf_url && (
                                        <a href={act.pdf_url} target="_blank" rel="noopener noreferrer" className="button button--sm button--link">
                                            PDF
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="text--center margin-top--md">
                    <button
                        className="button button--secondary button--sm margin-right--sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                    >
                        Prev
                    </button>
                    <span className="margin-horiz--sm">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        className="button button--secondary button--sm margin-left--sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                    >
                        Next
                    </button>
                </div>
            )}

            {filteredActs.length === 0 && (
                <div className="text--center margin-vert--xl">
                    <p>No acts found matching criteria.</p>
                </div>
            )}
        </div>
    );
}
