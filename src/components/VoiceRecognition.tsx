import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecognitionProps {
  onTranscript: (transcript: string) => void;
  isDisabled?: boolean;
}

export const VoiceRecognition = ({ onTranscript, isDisabled }: VoiceRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Verifica se o navegador suporta Web Speech API
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = "pt-BR";

    recognitionInstance.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece;
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        onTranscript(finalTranscript);
        setIsListening(false);
        toast({
          title: "Transcrição concluída!",
          description: `"${finalTranscript}"`,
        });
      } else {
        setTranscript(interimTranscript);
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      
      let errorMessage = "Erro no reconhecimento de voz";
      if (event.error === "not-allowed") {
        errorMessage = "Permissão de microfone negada. Por favor, permita o acesso ao microfone.";
      } else if (event.error === "no-speech") {
        errorMessage = "Nenhuma fala detectada. Tente novamente.";
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [onTranscript, toast]);

  const startListening = () => {
    if (!recognition) return;
    
    setTranscript("");
    setIsListening(true);
    recognition.start();
    
    toast({
      title: "Ouvindo...",
      description: "Fale agora o comando de transação",
    });
  };

  const stopListening = () => {
    if (!recognition) return;
    recognition.stop();
    setIsListening(false);
  };

  if (!isSupported) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Comando de Voz
        </CardTitle>
        <CardDescription>
          Use comandos de voz para registrar transações rapidamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {!isListening ? (
            <Button
              onClick={startListening}
              disabled={isDisabled}
              className="flex-1"
            >
              <Mic className="mr-2 h-4 w-4" />
              Gravar Comando
            </Button>
          ) : (
            <Button
              onClick={stopListening}
              variant="destructive"
              className="flex-1"
            >
              <MicOff className="mr-2 h-4 w-4" />
              Parar Gravação
            </Button>
          )}
        </div>

        {isListening && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1 h-4 bg-red-500 animate-pulse" />
              <div className="w-1 h-6 bg-red-500 animate-pulse delay-75" />
              <div className="w-1 h-4 bg-red-500 animate-pulse delay-150" />
            </div>
            <Badge variant="destructive">Ouvindo...</Badge>
          </div>
        )}

        {transcript && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Transcrição:</p>
            <p className="font-medium">{transcript}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">Exemplos de comandos:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>"Comprei 5 quilos de cobre por 50 reais"</li>
            <li>"Vendi 10kg de alumínio por 35 reais"</li>
            <li>"Compra de 2.5 toneladas de ferro a 100 reais"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
