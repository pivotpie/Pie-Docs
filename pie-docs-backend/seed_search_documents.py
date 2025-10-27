"""
Seed Search Documents with Embeddings
Creates sample documents and generates embeddings for testing search functionality
"""
import logging
from app.database import get_db_cursor, init_db_pool, close_db_pool
from app.rag_service import rag_service
from app.embedding_service import embedding_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample documents for testing search
SAMPLE_DOCUMENTS = [
    {
        "title": "Q3 2024 Financial Report",
        "content": """This is the comprehensive financial report for Q3 2024. Our company showed strong growth across all sectors.
        Revenue increased by 25% compared to the previous quarter. The sales team exceeded their targets by 15%.
        Operating expenses were well controlled at 12% below budget. We also launched three new products during this period.
        Customer satisfaction scores improved to 4.5 out of 5. The finance department successfully implemented new accounting software.
        Total revenue for Q3 was $5.2 million with a net profit margin of 18%.""",
        "document_type": "Financial Report",
        "author": "Finance Department",
        "tags": ["finance", "quarterly", "2024", "report"]
    },
    {
        "title": "Employee Handbook 2024",
        "content": """Welcome to our company! This handbook outlines all policies and procedures for employees.
        Work hours are Monday to Friday, 9 AM to 5 PM. We offer flexible working arrangements and remote work options.
        All employees receive comprehensive health insurance, dental coverage, and vision benefits.
        The company provides 15 days of paid vacation annually, plus 10 sick days. We have a 401(k) retirement plan with company matching.
        Our anti-harassment policy ensures a safe and respectful workplace. Professional development opportunities include training courses and conferences.""",
        "document_type": "HR Policy",
        "author": "Human Resources",
        "tags": ["hr", "policies", "employee", "benefits"]
    },
    {
        "title": "Product Launch Strategy 2024",
        "content": """Our new product launch strategy for 2024 focuses on digital marketing and customer engagement.
        Target market analysis shows strong demand in the 25-45 age demographic. We will use social media advertising extensively.
        The product features innovative technology and competitive pricing. Launch date is set for Q4 2024.
        Marketing budget allocated is $500,000 for the first quarter. We expect to capture 15% market share in the first year.
        Partnerships with major retailers will expand our distribution channels.""",
        "document_type": "Business Strategy",
        "author": "Marketing Team",
        "tags": ["marketing", "strategy", "product", "2024"]
    },
    {
        "title": "IT Security Policy and Guidelines",
        "content": """Information security is critical to protecting company assets and customer data.
        All employees must use strong passwords and enable two-factor authentication. Regular security training is mandatory.
        Data encryption is required for all sensitive information. Access controls follow the principle of least privilege.
        Incident response procedures must be followed in case of security breaches. Regular security audits are conducted quarterly.
        Cloud services must be approved by IT before use. Personal devices must comply with our BYOD policy.""",
        "document_type": "Policy Document",
        "author": "IT Department",
        "tags": ["security", "IT", "policy", "compliance"]
    },
    {
        "title": "Customer Service Excellence Training Manual",
        "content": """This training manual covers best practices for customer service representatives.
        Active listening and empathy are key skills for success. Response time targets are under 2 hours for emails.
        Phone calls should be answered within 3 rings. Customer satisfaction is our top priority.
        Escalation procedures should be followed for complex issues. Product knowledge training is provided monthly.
        We use CRM software to track all customer interactions. Quality assurance monitors 10% of all calls.""",
        "document_type": "Training Manual",
        "author": "Customer Service",
        "tags": ["training", "customer service", "manual", "procedures"]
    },
    {
        "title": "Annual Sales Performance Review 2023",
        "content": """The sales team achieved outstanding results in 2023, exceeding annual targets by 20%.
        Total revenue was $18.5 million, up from $15.2 million in 2022. Top performing sales representatives received bonuses.
        New customer acquisition increased by 35%. Customer retention rate improved to 92%.
        International sales grew by 40%, particularly in European markets. The sales pipeline for 2024 looks promising.
        We expanded the sales team by hiring 5 new representatives.""",
        "document_type": "Performance Review",
        "author": "Sales Management",
        "tags": ["sales", "performance", "2023", "review"]
    },
    {
        "title": "Software Development Best Practices Guide",
        "content": """This guide outlines coding standards and best practices for our development team.
        Code reviews are mandatory for all pull requests. Unit test coverage should be at least 80%.
        We follow agile methodology with two-week sprints. Daily standup meetings keep the team synchronized.
        Git version control is used for all projects. Continuous integration and deployment pipelines automate testing.
        Documentation should be updated with all code changes. Security vulnerabilities must be addressed immediately.""",
        "document_type": "Technical Guide",
        "author": "Engineering Team",
        "tags": ["development", "coding", "best practices", "agile"]
    },
    {
        "title": "Sustainability and Environmental Policy",
        "content": """Our commitment to environmental sustainability guides all business decisions.
        We aim to reduce carbon emissions by 30% by 2025. Recycling programs are in place at all office locations.
        Energy-efficient equipment is standard for all purchases. We prioritize suppliers with strong environmental practices.
        Remote work options reduce commuting emissions. Paper usage has been reduced by 60% through digitalization.
        Annual sustainability reports track our progress toward environmental goals.""",
        "document_type": "Policy Document",
        "author": "Corporate Responsibility",
        "tags": ["sustainability", "environment", "policy", "green"]
    },
    {
        "title": "Q1 2024 Marketing Campaign Results",
        "content": """The Q1 marketing campaign exceeded expectations with a 45% increase in brand awareness.
        Social media engagement grew by 60% across all platforms. Email marketing achieved a 25% open rate.
        Website traffic increased by 35% with a conversion rate of 3.5%. Cost per acquisition decreased by 20%.
        The campaign reached 2 million potential customers. ROI was 280%, well above the industry average.
        Customer feedback was overwhelmingly positive with 4.6/5 satisfaction score.""",
        "document_type": "Marketing Report",
        "author": "Marketing Analytics",
        "tags": ["marketing", "campaign", "Q1", "2024", "results"]
    },
    {
        "title": "Emergency Response and Business Continuity Plan",
        "content": """This plan ensures business operations continue during emergencies and disasters.
        Emergency contacts and procedures are posted in all work areas. Backup systems are tested monthly.
        Critical data is backed up daily to off-site locations. Communication protocols are established for all scenarios.
        Employees receive annual emergency training. Alternative work sites are designated for major disruptions.
        Supply chain contingencies ensure material availability. The plan is reviewed and updated quarterly.""",
        "document_type": "Emergency Plan",
        "author": "Risk Management",
        "tags": ["emergency", "business continuity", "disaster recovery", "safety"]
    }
]


def seed_documents():
    """Create sample documents with embeddings for search testing"""
    try:
        logger.info("Starting document seeding process...")

        for idx, doc_data in enumerate(SAMPLE_DOCUMENTS, 1):
            logger.info(f"\n{'='*60}")
            logger.info(f"Processing document {idx}/{len(SAMPLE_DOCUMENTS)}: {doc_data['title']}")
            logger.info(f"{'='*60}")

            try:
                # Create document in database
                with get_db_cursor(commit=True) as cursor:
                    cursor.execute(
                        """
                        INSERT INTO documents (
                            title, content, document_type, author, tags
                        )
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        (
                            doc_data['title'],
                            doc_data['content'],
                            doc_data['document_type'],
                            doc_data['author'],
                            doc_data['tags']
                        )
                    )

                    document_id = cursor.fetchone()[0]
                    logger.info(f"✓ Created document with ID: {document_id}")

                # Generate document-level embedding
                logger.info("Generating document embedding...")
                embedding_success = rag_service.generate_and_store_document_embedding(
                    document_id,
                    doc_data['title'],
                    doc_data['content']
                )

                if embedding_success:
                    logger.info("✓ Document embedding generated successfully")
                else:
                    logger.warning("✗ Failed to generate document embedding")

                # Generate chunks and chunk embeddings
                logger.info("Generating chunks and embeddings...")
                chunks_success = rag_service.generate_and_store_chunks(
                    document_id,
                    doc_data['content']
                )

                if chunks_success:
                    logger.info("✓ Chunks and embeddings generated successfully")
                else:
                    logger.warning("✗ Failed to generate chunks")

                logger.info(f"✓ Successfully processed: {doc_data['title']}\n")

            except Exception as e:
                logger.error(f"✗ Error processing document '{doc_data['title']}': {e}\n")
                continue

        logger.info("\n" + "="*60)
        logger.info("SEEDING COMPLETE!")
        logger.info("="*60)
        logger.info(f"Successfully seeded {len(SAMPLE_DOCUMENTS)} documents with embeddings")
        logger.info("You can now test the search functionality\n")

    except Exception as e:
        logger.error(f"Fatal error in seeding process: {e}")
        raise


if __name__ == "__main__":
    try:
        # Initialize database pool
        logger.info("Initializing database connection...")
        init_db_pool()

        # Load embedding model
        logger.info("Loading embedding model...")
        embedding_service.load_model()

        # Seed documents
        seed_documents()

    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        # Clean up
        close_db_pool()
