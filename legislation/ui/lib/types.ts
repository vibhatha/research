export interface Act {
    doc_type: string;
    doc_id: string;
    num: string;
    date_str: string;
    description: string;
    url_metadata: string;
    lang: string;
    url_pdf: string;
    doc_number: string;
    domain: string;
    year?: string;
}

export interface ActVersion {
    doc_id: string;
    year: number;
    date: string;
    title: string;
    doc_number: string;
    is_amendment: boolean;
    url_pdf: string;
}

export interface ActFamily {
    base_title: string;
    slug: string;
    domain: string;
    versions: ActVersion[];
}
