import logging
import os
from axiom.logging import AxiomHandler
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("raccon")
logger.setLevel(logging.INFO)

axiom_token = os.getenv("AXIOM_TOKEN")
axiom_dataset = os.getenv("AXIOM_DATASET")

if axiom_token and axiom_dataset:
    axiom_handler = AxiomHandler(token=axiom_token, dataset=axiom_dataset)
    logger.addHandler(axiom_handler)
else:
    console_handler = logging.StreamHandler()
    logger.addHandler(console_handler)
