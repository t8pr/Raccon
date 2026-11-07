import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { scanTagData } from "../../api/journeyApi";
import AppNavbar from "../../components/layout/AppNavbar";
import InlineMessage from "../../components/ui/InlineMessage";
import Button from "../../components/ui/Button";
import { useAuth } from "../../context/AuthContext";

export default function ScanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  
  const tagHash = searchParams.get("tag");
  const userHash = searchParams.get("user");
  
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function executeAutoScan() {
      if (!tagHash || !userHash) {
        setError("رابط غير صالح أو بيانات مفقودة.");
        setIsLoading(false);
        return;
      }

      try {
        const data = await scanTagData(tagHash, userHash, accessToken);
        setScanResult(data);
      } catch (err) {
        setError(err.detail || "حدث خطأ أثناء المسح. الرجاء المحاولة مرة أخرى.");
      } finally {
        setIsLoading(false);
      }
    }

    executeAutoScan();
  }, [tagHash, userHash, accessToken]);

  return (
    <div dir="rtl">
      <AppNavbar />
      <section className="home-page">
        {isLoading ? (
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>جاري قراءة البطاقة...</h2>
          </div>
        ) : error ? (
          <div style={{ maxWidth: "500px", margin: "50px auto" }}>
            <InlineMessage type="error" message={error} />
            <div style={{ marginTop: "20px" }}>
              <Button fullWidth onClick={() => navigate("/home")}>
                العودة للرئيسية
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: "500px", margin: "50px auto", textAlign: "center" }}>
            <InlineMessage type="success" message={scanResult.message} />
            <h1 style={{ marginTop: "20px" }}>النقاط الحالية: {scanResult.current_score}</h1>
            
            {}
            <div style={{ marginTop: "20px", padding: "20px", border: "2px dashed #4333A5", borderRadius: "12px", background: "#F4F2FB", textAlign: "right" }}>
              <h3 style={{ color: "#1B1442", marginBottom: "15px", textAlign: "center" }}>
                {scanResult.tag_type === "trap" ? "فخ" : "تلميح"}:
              </h3>
              
              {scanResult.content && (
                <div>
                  {scanResult.tag_type === "clue" && (
                    <>
                      {scanResult.content.hint && <p style={{ fontSize: "18px" }}><strong>التلميح:</strong> {scanResult.content.hint}</p>}
                      {scanResult.content.image && <img src={scanResult.content.image} alt="Clue" style={{ maxWidth: "100%", borderRadius: "8px", marginTop: "10px" }} />}
                    </>
                  )}
                  {scanResult.tag_type === "trap" && (
                    <>
                      {scanResult.content.boom && <p style={{ fontSize: "18px", color: "#c0392b" }}><strong>التأثير:</strong> خصم {scanResult.content.boom} نقاط</p>}
                      {scanResult.content.freeze && <p style={{ fontSize: "18px", color: "#4333A5" }}><strong>التأثير:</strong> تجميد لمدة {scanResult.content.freeze} ثانية</p>}
                    </>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: "30px" }}>
              <Button fullWidth onClick={() => navigate("/home")}>
                متابعة
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}